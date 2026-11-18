import type { FastifyInstance } from 'fastify';
import { status } from 'http-status';
import { describe, expect } from 'vitest';
import { test } from './test.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('request id', () => {
  const withEcho = (instance: FastifyInstance) => {
    instance.get('/echo-id', async request => ({ id: request.id }));
  };

  test('generates a uuid and returns it in the response header', async ({ createApp }) => {
    const app = await createApp(withEcho);
    const res = await app.inject({ method: 'GET', url: '/echo-id' });

    expect(res.headers['x-request-id']).toMatch(UUID);
    expect(res.json()).toEqual({ id: res.headers['x-request-id'] });
  });

  test('propagates an incoming x-request-id', async ({ createApp }) => {
    const app = await createApp(withEcho);
    const res = await app.inject({
      method: 'GET',
      url: '/echo-id',
      headers: { 'x-request-id': 'upstream-abc.123' },
    });

    expect(res.headers['x-request-id']).toBe('upstream-abc.123');
    expect(res.json()).toEqual({ id: 'upstream-abc.123' });
  });

  test('sets the header on error responses too', async ({ createApp }) => {
    const app = await createApp(withEcho);
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });

    expect(res.statusCode).toBe(status.NOT_FOUND);
    expect(res.headers['x-request-id']).toMatch(UUID);
  });
});
