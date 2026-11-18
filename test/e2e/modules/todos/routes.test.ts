import { status } from 'http-status';
import { describe, expect } from 'vitest';
import type { Todo } from '../../../../src/modules/todos/schema.ts';
import { test } from '../../test.ts';

describe('todos over http', () => {
  test('walks the full lifecycle of a todo', async ({ baseUrl }) => {
    const created = await fetch(`${baseUrl}/todos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'ship the template' }),
    });
    expect(created.status).toBe(status.CREATED);
    const todo = (await created.json()) as Todo;
    expect(todo).toMatchObject({ title: 'ship the template', done: false });

    const patched = await fetch(`${baseUrl}/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    expect(patched.status).toBe(status.OK);
    expect(await patched.json()).toMatchObject({ id: todo.id, done: true });

    const listed = await fetch(`${baseUrl}/todos?done=true`);
    expect(listed.status).toBe(status.OK);
    const list = (await listed.json()) as { items: Todo[]; total: number };
    expect(list.items.map(item => item.id)).toContain(todo.id);

    const deleted = await fetch(`${baseUrl}/todos/${todo.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(status.NO_CONTENT);

    const gone = await fetch(`${baseUrl}/todos/${todo.id}`);
    expect(gone.status).toBe(status.NOT_FOUND);
  });

  test('returns the error envelope for an invalid payload', async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });

    expect(res.status).toBe(status.BAD_REQUEST);
    expect(await res.json()).toMatchObject({ error: 'ValidationError' });
  });
});
