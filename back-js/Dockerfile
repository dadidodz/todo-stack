# ---- Stage 1: install runtime dependencies (pnpm + caches stay here) ----
FROM node:26-alpine AS deps
WORKDIR /app

# pnpm through corepack; the version comes from "packageManager" in package.json
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ---- Stage 2: runtime (plain Alpine + its nodejs package, no npm/yarn/pnpm) ----
FROM alpine:3.24

# Alpine's Node build links shared system libs, hence much smaller than the official binary.
# The exact version follows Alpine's package (check with: docker run --rm todo-back-js node -v)
# DL3018 (pin apk versions) ignored: Alpine only keeps the latest build per branch, so a pin
# breaks the build on the next patch; alpine:3.24 already pins the branch.
# hadolint ignore=DL3018
RUN apk add --no-cache nodejs \
 && addgroup -S -g 10001 node && adduser -S -u 10001 -G node node

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
COPY config.docker.json config.json

USER 10001:10001
EXPOSE 3000

CMD ["node", "server.js"]
