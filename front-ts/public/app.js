// Same-origin path: nginx forwards /api/* to back-js.
const API = '/api/todos';
const form = document.querySelector('#form');
const input = document.querySelector('#title');
const list = document.querySelector('#list');
const error = document.querySelector('#error');
async function api(path, method = 'GET', body) {
    const res = await fetch(API + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body && JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`${method} ${API + path} failed (${res.status})`);
    return res.status === 204 ? undefined : res.json();
}
// Run an action, then reload the list from the server; show any error.
async function run(action) {
    try {
        await action();
        render(await api(''));
        error.textContent = '';
    }
    catch (err) {
        error.textContent = err instanceof Error ? err.message : String(err);
    }
}
function render(todos) {
    list.replaceChildren(...todos.map((todo) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.done;
        checkbox.onchange = () => run(() => api(`/${todo.id}`, 'PATCH', { done: checkbox.checked }));
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
        await api('', 'POST', { title });
        form.reset();
    });
};
run(async () => { });
export {};
