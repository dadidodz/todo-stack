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

# pcre2 10.48 has a fixable HIGH CVE (CVE-2026-103111) not yet fixed in nginx:1.30-alpine-slim.
# Targeted upgrade: a full `apk upgrade` re-adds every upgraded package in a new layer (+11 MB).
# Remove once the base ships pcre2 >= 10.49: docker run --rm nginx:1.30-alpine-slim apk list -I pcre2
RUN apk upgrade --no-cache pcre2

# Default backend address = its service name in docker compose. Override with -e BACKEND_URL=...
ENV BACKEND_URL=http://back-js:3000

COPY default.conf.template /etc/nginx/templates/
COPY --from=build /app/public/ /usr/share/nginx/html/
