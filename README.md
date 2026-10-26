# TodoList

A minimalist todo list, made to practice Docker. The app is deliberately small: the
interesting part is the Dockerfiles and the compose setup. See [OBJECTIVE.md](OBJECTIVE.md)
for the original brief.

## Run it

Requirements: Docker with Compose v2.

```sh
cp .env.example .env   # DB credentials, edit if you like (first run only)
docker compose up -d --build
```

| URL                     | What                        |
|-------------------------|-----------------------------|
| http://localhost:8080   | `front-js` (vanilla JS)     |
| http://localhost:8081   | `front-ts` (TypeScript)     |

Both fronts share the same API and database, so a todo added in one shows up in the other
after a refresh.

```sh
docker compose ps                         # todo-db should be "healthy"
docker compose logs -f back-js            # API logs
docker compose exec todo-db psql -U todo  # SQL shell on the database
docker compose down                       # stop (todos are kept)
docker compose down -v                    # stop and delete the db-data volume
```

## How it works

```
 browser ──:8080──> front-js (nginx) ─┐
 browser ──:8081──> front-ts (nginx) ─┤ /api/* -> back-js:3000
                                      ▼
                               back-js (Node) ──> todo-db (PostgreSQL 18, volume db-data)
                     └──────────── network todo-net ────────────┘
```

Only the two fronts publish ports. `back-js` and `todo-db` are reachable only inside the
`todo-net` bridge network, where services find each other by service name.

### Services

| Service    | Image / build                         | Role |
|------------|---------------------------------------|------|
| `todo-db`  | `postgres:18`                         | Stores todos. Has a `pg_isready` healthcheck. |
| `back-js`  | `back-js/Dockerfile`                  | REST API in plain `node:http` + `pg`. Starts only once the db is healthy, and creates the `todos` table if missing. Reads `config.json` (port only), copied from `config.docker.json` into the image; DB credentials come from `.env` as `PG*` env vars (never baked into the image). |
| `front-js` | `front-js/Dockerfile`                 | Static HTML + vanilla JS served by nginx. |
| `front-ts` | `front-ts/Dockerfile`                 | Same UI written in TypeScript, compiled with `tsc` in a build stage, then served by nginx. |

### The `/api` proxy

The pages call `/api/todos` on their own origin (no CORS needed). nginx strips the `/api`
prefix and forwards to `BACKEND_URL` (default `http://back-js:3000`, override with
`-e BACKEND_URL=...`). The nginx config is a template filled at container start by the
image's `envsubst` step. Its DNS resolver comes from `/etc/resolv.conf` (Docker's `127.0.0.11`
under compose) with a 10s TTL, so a recreated `back-js` container is picked up without
restarting nginx. `BACKEND_URL` can also be an `https` URL (used on Render).

### API

| Method | Path         | Body                  | Returns              |
|--------|--------------|-----------------------|----------------------|
| GET    | `/todos`     | —                     | `200` `Todo[]`       |
| POST   | `/todos`     | `{ "title": string }` | `201` created `Todo` |
| PATCH  | `/todos/:id` | `{ "done": boolean }` | `200` updated `Todo` |
| DELETE | `/todos/:id` | —                     | `204`                |

`Todo = { id: number, title: string, done: boolean }`. Errors: `400` (bad body/JSON),
`404` (unknown id or path), `405`, `500`, each with `{ "error": "..." }`.

Try it through a front's proxy:

```sh
curl -X POST localhost:8080/api/todos -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
curl localhost:8080/api/todos
curl -X PATCH localhost:8080/api/todos/1 -H "Content-Type: application/json" -d '{"done":true}'
curl -X DELETE localhost:8080/api/todos/1
```

On `SIGTERM` (`docker stop`), the API finishes in-flight requests and closes the DB pool
before exiting.

### Image sizes

| Image     | Before  | After   | How |
|-----------|---------|---------|-----|
| back-js   | 292 MB  | 114 MB  | Multi-stage: deps installed with pnpm on `node:24-alpine`, runtime on `alpine:3.24` + Alpine's `nodejs` package, non-root user |
| fronts    | 92.8 MB | 21.8 MB | `nginx:1.30-alpine-slim` (+1.2 MB: patched `pcre2`, see the Dockerfiles); `front-ts` keeps Node/TypeScript in the discarded build stage |

## Project layout

```
back-js/    server.js, Dockerfile, config.json (local), config.docker.json (in the image)
front-js/   public/ (index.html, app.js), nginx template, Dockerfile
front-ts/   src/app.ts -> public/app.js via `pnpm build`, nginx template, Dockerfile
.github/workflows/   CI, see below
docker-compose.yml
.env.example   DB credentials template: copy to .env (gitignored, read by compose)
render.yaml    Render Blueprint, see below
```

## Running the API without Docker

Needs Node 24+, pnpm, and a PostgreSQL with the `todo` user/db matching
`back-js/config.json` (the API creates its table on startup).

```sh
cd back-js
pnpm install
pnpm start   # listens on http://localhost:3000
pnpm test    # API tests: start server.js against that Postgres (run them on Linux/WSL: they check the SIGTERM shutdown)
```

The fronts call the relative path `/api`, so they need the nginx proxy: run them with Docker.

## Deploy on Render

`render.yaml` is a [Blueprint](https://render.com/docs/blueprint-spec) for Render's free plan,
built by Render from the same Dockerfiles. Compose stays the way to run it on your own server.

| Render resource  | Type                 | Notes |
|------------------|----------------------|-------|
| `todo-db`        | Postgres 18 (free)   | Private network only. **Expires 30 days after creation** (free plan) |
| `todo-back-js`   | Web service (Docker) | Gets the db through `DATABASE_URL` (internal connection string) |
| `todo-front-js`  | Web service (Docker) | Proxies `/api` to `BACKEND_URL` |
| `todo-front-ts`  | Web service (Docker) | Same |

Free web services can't receive private network traffic, so `back-js` is public and the fronts
reach it through its `https://….onrender.com` URL. Free services sleep after 15 min without
traffic (about a minute to wake up). Each service rebuilds only when its folder changes, once
the GitHub checks of the commit are green.

1. Render dashboard -> **New** -> **Blueprint**, pick this repo.
2. When asked for `BACKEND_URL` (both fronts), enter `https://todo-back-js.onrender.com`.
3. Once deployed, check `todo-back-js`'s real URL on its page: if Render added a suffix, fix
   `BACKEND_URL` in both fronts' **Environment** tab.

## CI (GitHub Actions)

| Workflow   | Runs when                          | Jobs |
|------------|------------------------------------|------|
| `back-js`  | `back-js/**` changes, or manually  | `test` (API tests against a throwaway Postgres) -> `lint` (hadolint) -> `build` (build, Trivy scan, push) |
| `front-js` | `front-js/**` changes, or manually | `lint` -> `build` |
| `front-ts` | `front-ts/**` changes, or manually | `lint` -> `build` (the image build runs `tsc`, so it is also the type check) |
| `stack`    | any change, or manually            | `smoke`: `docker compose up`, add a todo through `front-js`, read it back through `front-ts` |

`lint` and `build` live once in the reusable `_image.yml`. The scan fails on HIGH/CRITICAL
vulnerabilities that have a fix. Images are pushed only from `main`, after the scan, to
`ghcr.io/<owner>/todo-<service>` with tags `latest` and `sha-<commit>`.
Manual run: Actions tab -> pick the workflow -> **Run workflow**.
