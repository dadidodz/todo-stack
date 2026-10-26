// Black-box API tests: run the real server.js against the Postgres in config.json
// (localhost:5432, todo/todo; server.js creates the table). Run with: pnpm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const base = 'http://localhost:3000';
let server;

async function api(method, path, body) {
  const res = await fetch(base + path, { method, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json() };
}

before(async () => {
  server = spawn(process.execPath, ['server.js'], { cwd: import.meta.dirname, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => String(d).includes('listening') && resolve());
    server.once('exit', (code) => reject(new Error(`server exited early with code ${code}`)));
  });
});

after(async () => {
  server.kill('SIGTERM');
  const [code] = await once(server, 'exit');
  assert.equal(code, 0, 'graceful shutdown should exit with 0');
});

test('create, list, toggle, delete', async () => {
  const created = await api('POST', '/todos', { title: '  Buy milk  ' });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'Buy milk');
  assert.equal(created.body.done, false);
  const { id } = created.body;

  const list = await api('GET', '/todos');
  assert.equal(list.status, 200);
  assert.ok(list.body.some((t) => t.id === id));

  const toggled = await api('PATCH', `/todos/${id}`, { done: true });
  assert.equal(toggled.status, 200);
  assert.equal(toggled.body.done, true);

  assert.equal((await api('DELETE', `/todos/${id}`)).status, 204);
  assert.equal((await api('DELETE', `/todos/${id}`)).status, 404);
  assert.equal((await api('PATCH', `/todos/${id}`, { done: true })).status, 404);
});

test('rejects bad bodies with 400', async () => {
  assert.equal((await api('POST', '/todos', { title: '   ' })).status, 400);
  assert.equal((await api('POST', '/todos', { title: 42 })).status, 400);
  assert.equal((await api('POST', '/todos', '{not json')).status, 400);
  assert.equal((await api('PATCH', '/todos/1', { done: 'yes' })).status, 400);
});

test('unknown routes and methods', async () => {
  assert.equal((await api('GET', '/nope')).status, 404);
  assert.equal((await api('GET', '/todos/abc')).status, 404);
  assert.equal((await api('GET', '/todos/1/extra')).status, 404);
  assert.equal((await api('PUT', '/todos')).status, 405);
});
