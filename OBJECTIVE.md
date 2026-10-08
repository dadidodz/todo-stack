# Objective

A minimalist todo list app. It only exists to give us something to write Dockerfiles for,
so it stays small: features don't matter, the containers do.

## Parts

| Folder     | Language   | Role                                                   |
|------------|------------|--------------------------------------------------------|
| `front-js` | JavaScript | Static HTML + vanilla JS, no build step                |
| `front-ts` | TypeScript | Same UI, compiled with `tsc` (needs a build stage)     |
| `back-js`  | JavaScript | Node.js REST API, used by both fronts                  |
| —          | —          | PostgreSQL 18 (official `postgres:18` image)           |

## API contract (shared by both fronts)

Base URL: `http://localhost:3000`

| Method | Path         | Body                  | Returns         |
|--------|--------------|-----------------------|-----------------|
| GET    | `/todos`     | —                     | `Todo[]`        |
| POST   | `/todos`     | `{ "title": string }` | created `Todo`  |
| PATCH  | `/todos/:id` | `{ "done": boolean }` | updated `Todo`  |
| DELETE | `/todos/:id` | —                     | `204`           |

`Todo = { id: number, title: string, done: boolean }`

## Steps

1. [x] `back-js`: API above, backed by PostgreSQL
2. [x] `front-js`: page that lists, adds, toggles and deletes todos
3. [x] `front-ts`: port of `front-js` to TypeScript
4. [x] Dockerfiles for each part
5. [x] `docker-compose.yml` to run everything together (fronts, back, db + volume)
6. [x] Reduce image sizes (disk usage, compressed size in brackets)
   - back-js: 292 MB -> 114 MB [31.3 MB]: multi-stage, runtime on `alpine:3.24` + Alpine's `nodejs` package
   - fronts: 92.8 MB -> 20.6 MB [5.75 MB]: `nginx:1.30-alpine-slim`
