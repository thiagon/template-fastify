import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Todo } from '../../../../src/modules/todos/schema.ts';
import { startTestServer, type TestServer } from '../../../helpers/server.ts';

describe('todos over http', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('walks the full lifecycle of a todo', async () => {
    const created = await fetch(`${server.baseUrl}/todos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'ship the template' }),
    });
    expect(created.status).toBe(201);
    const todo = (await created.json()) as Todo;
    expect(todo).toMatchObject({ title: 'ship the template', done: false });

    const patched = await fetch(`${server.baseUrl}/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({ id: todo.id, done: true });

    const listed = await fetch(`${server.baseUrl}/todos?done=true`);
    expect(listed.status).toBe(200);
    const list = (await listed.json()) as { items: Todo[]; total: number };
    expect(list.items.map(item => item.id)).toContain(todo.id);

    const deleted = await fetch(`${server.baseUrl}/todos/${todo.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);

    const gone = await fetch(`${server.baseUrl}/todos/${todo.id}`);
    expect(gone.status).toBe(404);
  });

  it('returns the error envelope for an invalid payload', async () => {
    const res = await fetch(`${server.baseUrl}/todos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'ValidationError' });
  });
});
