import http from 'node:http';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url)));
// DATABASE_URL: set on Render; unset elsewhere, so config.db / PG* vars apply as before
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ...config.db });

// Idempotent: works on an empty managed database (Render) as well as an existing one
await pool.query(`CREATE TABLE IF NOT EXISTS todos (
  id    SERIAL PRIMARY KEY,
  title TEXT    NOT NULL,
  done  BOOLEAN NOT NULL DEFAULT false
)`);

function send(res, status, body) {
  if (body === undefined) return res.writeHead(status).end();
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
}

async function readJson(req) {
  let data = '';
  for await (const chunk of req) data += chunk;
  return JSON.parse(data || '{}');
}

const server = http.createServer(async (req, res) => {
  // "/todos/3?x=1" -> ["", "todos", "3"]
  const [, resource, id, extra] = req.url.split('?')[0].split('/');
  if (resource !== 'todos' || extra !== undefined || (id && !/^\d+$/.test(id))) {
    return send(res, 404, { error: 'not found' });
  }

  try {
    if (req.method === 'GET' && !id) {
      const { rows } = await pool.query('SELECT * FROM todos ORDER BY id');
      return send(res, 200, rows);
    }
    if (req.method === 'POST' && !id) {
      const { title } = await readJson(req);
      if (typeof title !== 'string' || !title.trim()) return send(res, 400, { error: 'title is required' });
      const { rows } = await pool.query('INSERT INTO todos (title) VALUES ($1) RETURNING *', [title.trim()]);
      return send(res, 201, rows[0]);
    }
    if (req.method === 'PATCH' && id) {
      const { done } = await readJson(req);
      if (typeof done !== 'boolean') return send(res, 400, { error: 'done must be a boolean' });
      const { rows } = await pool.query('UPDATE todos SET done = $1 WHERE id = $2 RETURNING *', [done, id]);
      return rows[0] ? send(res, 200, rows[0]) : send(res, 404, { error: 'not found' });
    }
    if (req.method === 'DELETE' && id) {
      const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
      return rowCount ? send(res, 204) : send(res, 404, { error: 'not found' });
    }
    send(res, 405, { error: 'method not allowed' });
  } catch (err) {
    if (err instanceof SyntaxError) return send(res, 400, { error: 'invalid JSON' });
    console.error(err);
    send(res, 500, { error: 'internal error' });
  }
});

server.listen(config.port, () => console.log(`back-js listening on port ${config.port}`));

// docker stop sends SIGTERM to PID 1; Node ignores it by default and gets SIGKILLed after a timeout.
// Finish in-flight requests, close the DB pool, then exit cleanly.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
