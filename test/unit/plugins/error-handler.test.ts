import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import createError from 'http-errors';
import { status } from 'http-status';
import { describe, expect, vi } from 'vitest';
import { z } from 'zod';
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

  test('logs thrown 5xx http errors and keeps their status', async ({ createApp }) => {
    let log: ReturnType<typeof vi.fn> | undefined;
    const app = await createApp(instance => {
      instance.get('/boom-503', async request => {
        log = vi.spyOn(request.log, 'error');
        throw createError.ServiceUnavailable('upstream down');
      });
    });
    const res = await app.inject({ method: 'GET', url: '/boom-503' });

    expect(res.statusCode).toBe(status.SERVICE_UNAVAILABLE);
    expect(res.json()).toEqual({ error: 'ServiceUnavailableError', message: 'upstream down' });
    expect(log).toHaveBeenCalledOnce();
  });

  test('passes framework 4xx errors through', async ({ createApp }) => {
    const app = await createApp(withBoomRoutes);
    const res = await app.inject({
      method: 'POST',
      url: '/todos',
      headers: { 'content-type': 'application/xml' },
      payload: '<todo/>',
    });

    expect(res.statusCode).toBe(status.UNSUPPORTED_MEDIA_TYPE);
    expect(res.json()).toMatchObject({ error: 'FastifyError' });
  });

  test('hides responses that break the route schema behind a 500', async ({ createApp }) => {
    const app = await createApp(instance => {
      instance
        .withTypeProvider<ZodTypeProvider>()
        .get(
          '/bad-shape',
          { schema: { response: { [status.OK]: z.object({ id: z.string() }) } } },
          async () => ({ id: 1 }) as unknown as { id: string },
        );
    });
    const res = await app.inject({ method: 'GET', url: '/bad-shape' });

    expect(res.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
    expect(res.json()).toEqual({ error: 'InternalServerError', message: 'internal error' });
  });
});
