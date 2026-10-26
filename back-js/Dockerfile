# ---- Stage 1: install runtime dependencies (pnpm + caches stay here) ----
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ---- Stage 2: runtime (plain Alpine + its nodejs package, no npm/yarn/pnpm) ----
FROM alpine:3.24

# hadolint ignore=DL3018
RUN apk add --no-cache nodejs

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
COPY config.docker.json config.json

USER 10001:10001
EXPOSE 3000

CMD ["node", "server.js"]
