# ================================================
# NEXUS AI PRO - Dockerfile
# Multi-stage production build
# Stage 1: deps   — install production node_modules
# Stage 2: builder— install all deps + build Vite frontend
# Stage 3: runner — lean production image
# ================================================

# ── Stage 1: Production dependencies ──────────────────────────────────────────
FROM node:20-bullseye-slim AS deps

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit

# ── Stage 2: Full build (includes devDeps for Vite) ───────────────────────────
FROM node:20-bullseye-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY . .

# Build the Vite frontend
ENV NODE_ENV=production
RUN npm run build

# ── Stage 3: Production runner ─────────────────────────────────────────────────
FROM node:20-bullseye-slim AS runner

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates wget && \
    rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd --system --gid 1001 nexus && \
    useradd --system --uid 1001 --gid nexus --shell /bin/false nexus

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps   --chown=nexus:nexus /app/node_modules ./node_modules
# Copy built frontend from builder stage
COPY --from=builder --chown=nexus:nexus /app/dist        ./dist
# Copy server and required source files
COPY --chown=nexus:nexus server.js     ./
COPY --chown=nexus:nexus package.json  ./
COPY --chown=nexus:nexus src/          ./src/

USER nexus

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
