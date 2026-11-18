import type { FastifyInstance } from 'fastify';
import { status } from 'http-status';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Todo } from '../../../../src/modules/todos/schema.ts';
import { createTestApp } from '../../../helpers/app.ts';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('todos routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTodo(title: string): Promise<Todo> {
    const res = await app.inject({ method: 'POST', url: '/todos', payload: { title } });
    return res.json<Todo>();
  }

  describe('POST /todos', () => {
    it('creates a todo and returns 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/todos',
        payload: { title: 'write the real module' },
      });

      expect(res.statusCode).toBe(status.CREATED);
      expect(res.json()).toMatchObject({ title: 'write the real module', done: false });
    });

    it('rejects an invalid body with 400 and field details', async () => {
      const res = await app.inject({ method: 'POST', url: '/todos', payload: { title: '' } });

      expect(res.statusCode).toBe(status.BAD_REQUEST);
      expect(res.json()).toMatchObject({
        error: 'ValidationError',
        details: [{ path: 'title' }],
      });
    });
  });

  describe('GET /todos', () => {
    it('filters by query and honors the limit', async () => {
      const created = await createTodo('mark as done');
      await app.inject({ method: 'PATCH', url: `/todos/${created.id}`, payload: { done: true } });

      const res = await app.inject({ method: 'GET', url: '/todos?done=true&limit=1' });

      expect(res.statusCode).toBe(status.OK);
      const body = res.json<{ items: Todo[] }>();
      expect(body.items).toHaveLength(1);
      expect(body.items[0]?.id).toBe(created.id);
    });

    it('rejects an out-of-range limit with 400', async () => {
      const res = await app.inject({ method: 'GET', url: '/todos?limit=999' });

      expect(res.statusCode).toBe(status.BAD_REQUEST);
      expect(res.json()).toMatchObject({ error: 'ValidationError' });
    });
  });

  describe('GET /todos/:id', () => {
    it('returns the stored todo', async () => {
      const created = await createTodo('fetch me');

      const res = await app.inject({ method: 'GET', url: `/todos/${created.id}` });

      expect(res.statusCode).toBe(status.OK);
      expect(res.json()).toEqual(created);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await app.inject({ method: 'GET', url: `/todos/${UNKNOWN_ID}` });

      expect(res.statusCode).toBe(status.NOT_FOUND);
      expect(res.json()).toMatchObject({ error: 'NotFoundError' });
    });

    it('returns 400 for a malformed id', async () => {
      const res = await app.inject({ method: 'GET', url: '/todos/not-a-uuid' });

      expect(res.statusCode).toBe(status.BAD_REQUEST);
      expect(res.json()).toMatchObject({ error: 'ValidationError', details: [{ path: 'id' }] });
    });
  });

  describe('PATCH /todos/:id', () => {
    it('returns 404 for an unknown id', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/todos/${UNKNOWN_ID}`,
        payload: { done: true },
      });

      expect(res.statusCode).toBe(status.NOT_FOUND);
    });
  });

  describe('DELETE /todos/:id', () => {
    it('deletes and returns 204', async () => {
      const created = await createTodo('delete me');

      const del = await app.inject({ method: 'DELETE', url: `/todos/${created.id}` });
      expect(del.statusCode).toBe(status.NO_CONTENT);

      const get = await app.inject({ method: 'GET', url: `/todos/${created.id}` });
      expect(get.statusCode).toBe(status.NOT_FOUND);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await app.inject({ method: 'DELETE', url: `/todos/${UNKNOWN_ID}` });

      expect(res.statusCode).toBe(status.NOT_FOUND);
    });
  });
});
