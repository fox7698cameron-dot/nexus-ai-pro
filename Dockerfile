# ════════════════════════════════════════════════════════════════════
# NEXUS AI PRO v3.0.0 — Multi-stage, multi-backend Dockerfile
# Targets: node-runner | python-runner | bun-runner | dev
# Usage:
#   docker build --target node-runner   -t nexus-ai-pro:node   .
#   docker build --target python-runner -t nexus-ai-pro:python .
#   docker build --target bun-runner    -t nexus-ai-pro:bun    .
# ════════════════════════════════════════════════════════════════════

# ── Shared base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 py3-pip make g++ git curl

# ── Node deps (cached layer) ─────────────────────────────────────────
FROM base AS node-deps
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit --omit=dev

# ── Full node deps + build (Vite) ───────────────────────────────────
FROM base AS node-builder
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY . .
RUN npm run build

# ── Node.js production runner (port 3001) ───────────────────────────
FROM node:20-alpine AS node-runner
LABEL maintainer="Cameron Fox <contact@nexusai.pro>"
LABEL version="3.0.0"
LABEL backend="node"
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=node-deps    /app/node_modules ./node_modules
COPY --from=node-builder /app/dist         ./dist
COPY server.js ./
COPY .env.example ./.env.example
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
CMD ["node", "server.js"]

# ── Python FastAPI production runner (port 8000) ─────────────────────
FROM python:3.12-slim AS python-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim AS python-runner
LABEL maintainer="Cameron Fox <contact@nexusai.pro>"
LABEL version="3.0.0"
LABEL backend="python"
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
COPY --from=python-builder /root/.local /root/.local
COPY --from=node-builder   /app/dist    ./dist
COPY server.py ./
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8000/api/health || exit 1
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# ── Bun production runner (port 3002) ────────────────────────────────
FROM oven/bun:1 AS bun-runner
LABEL maintainer="Cameron Fox <contact@nexusai.pro>"
LABEL version="3.0.0"
LABEL backend="bun"
WORKDIR /app
ENV NODE_ENV=production PORT=3002
COPY --from=node-builder /app/dist ./dist
COPY server.bun.ts ./
COPY package.json ./
RUN bun install --production
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/health || exit 1
CMD ["bun", "run", "server.bun.ts"]

# ── Development image (all servers + hot-reload) ─────────────────────
FROM base AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY requirements.txt* ./
RUN pip3 install -r requirements.txt 2>/dev/null || true
COPY . .
ENV NODE_ENV=development
EXPOSE 3001 3002 5173 8000
CMD ["npm", "run", "dev"]
