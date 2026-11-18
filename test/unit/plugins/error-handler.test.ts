import type { FastifyInstance } from 'fastify';
import createError from 'http-errors';
import { status } from 'http-status';
import { describe, expect } from 'vitest';
import { test } from '../test.ts';

describe('error handler', () => {
  const withBoomRoutes = (instance: FastifyInstance) => {
    instance.get('/boom-4xx', async () => {
      throw createError.Conflict('already exists');
    });
    instance.get('/boom-5xx', async () => {
      throw new Error('database credentials are wrong');
    });
  };

  test('answers unknown routes with the not-found envelope', async ({ createApp }) => {
    const app = await createApp(withBoomRoutes);
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });

    expect(res.statusCode).toBe(status.NOT_FOUND);
    expect(res.json()).toMatchObject({
      error: 'NotFoundError',
      message: 'route GET /does-not-exist not found',
    });
  });

  test('maps thrown http errors to their status and name', async ({ createApp }) => {
    const app = await createApp(withBoomRoutes);
    const res = await app.inject({ method: 'GET', url: '/boom-4xx' });

    expect(res.statusCode).toBe(status.CONFLICT);
    expect(res.json()).toMatchObject({ error: 'ConflictError', message: 'already exists' });
  });

  test('hides unexpected errors behind a 500 envelope', async ({ createApp }) => {
    const app = await createApp(withBoomRoutes);
    const res = await app.inject({ method: 'GET', url: '/boom-5xx' });

    expect(res.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
    expect(res.json()).toEqual({ error: 'InternalServerError', message: 'internal error' });
  });
});
