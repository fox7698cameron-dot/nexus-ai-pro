# ================================================
# NEXUS AI PRO - Dockerfile
# Multi-stage build for optimized production image
# ================================================

# Stage 1: Build
FROM node:18-bullseye-slim AS builder

# Install build deps required by some native modules (kept minimal)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package definitions first for efficient caching
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for tests)
RUN npm ci --no-fund --no-audit

# Copy app sources
COPY . .

# Default environment
ENV NODE_ENV=development
ENV PORT=3001

# Expose ports used by web + API
EXPOSE 3001 5173

# Default command is to run tests when invoked by compose. Can be overridden.
CMD ["npm", "test"]
