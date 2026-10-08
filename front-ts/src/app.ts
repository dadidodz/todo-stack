// Same-origin path: nginx forwards /api/* to back-js.
const API = '/api/todos';

type Todo = { id: number; title: string; done: boolean };

// Makes this file a module, so its top-level names don't collide with DOM globals.
export {};

const form = document.querySelector<HTMLFormElement>('#form')!;
const input = document.querySelector<HTMLInputElement>('#title')!;
const list = document.querySelector<HTMLUListElement>('#list')!;
const error = document.querySelector<HTMLParagraphElement>('#error')!;

async function api<T = void>(path: string, method = 'GET', body?: object): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${API + path} failed (${res.status})`);
  return res.status === 204 ? (undefined as T) : res.json();
}

// Run an action, then reload the list from the server; show any error.
async function run(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
    render(await api<Todo[]>(''));
    error.textContent = '';
  } catch (err) {
    error.textContent = err instanceof Error ? err.message : String(err);
  }
}

function render(todos: Todo[]): void {
  list.replaceChildren(...todos.map((todo) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.onchange = () => run(() => api<Todo>(`/${todo.id}`, 'PATCH', { done: checkbox.checked }));

    const title = document.createElement('span');
    title.textContent = todo.title; // textContent, not innerHTML: titles are user input

    const label = document.createElement('label');
    label.append(checkbox, ' ', title);

    const del = document.createElement('button');
    del.textContent = '✕';
    del.setAttribute('aria-label', `Delete "${todo.title}"`);
    del.onclick = () => run(() => api(`/${todo.id}`, 'DELETE'));

    const li = document.createElement('li');
    li.append(label, del);
    return li;
  }));
}

form.onsubmit = (event) => {
  event.preventDefault();
  const title = input.value;
  run(async () => {
    await api<Todo>('', 'POST', { title });
    form.reset();
  });
};

run(async () => {});
