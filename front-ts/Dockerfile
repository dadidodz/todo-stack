# ---- Stage 1: build (Node + pnpm + TypeScript, thrown away after) ----
FROM node:24-alpine AS build
WORKDIR /app

# pnpm through corepack; the version comes from "packageManager" in package.json
RUN corepack enable pnpm

# Dependencies first: this layer stays cached until package.json or the lockfile changes
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ src/
COPY public/ public/
RUN pnpm build

# ---- Stage 2: runtime (nginx + built files only) ----
FROM nginx:1.30-alpine-slim

# Default backend address = its service name in docker compose. Override with -e BACKEND_URL=...
ENV BACKEND_URL=http://back-js:3000

COPY default.conf.template /etc/nginx/templates/
COPY --from=build /app/public/ /usr/share/nginx/html/
