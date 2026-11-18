import type { FastifyInstance } from 'fastify';
import { status } from 'http-status';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('request id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp(instance => {
      instance.get('/echo-id', async request => ({ id: request.id }));
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a uuid and returns it in the response header', async () => {
    const res = await app.inject({ method: 'GET', url: '/echo-id' });

    expect(res.headers['x-request-id']).toMatch(UUID);
    expect(res.json()).toEqual({ id: res.headers['x-request-id'] });
  });

  it('propagates an incoming x-request-id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/echo-id',
      headers: { 'x-request-id': 'upstream-abc.123' },
    });

    expect(res.headers['x-request-id']).toBe('upstream-abc.123');
    expect(res.json()).toEqual({ id: 'upstream-abc.123' });
  });

  it('sets the header on error responses too', async () => {
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });

    expect(res.statusCode).toBe(status.NOT_FOUND);
    expect(res.headers['x-request-id']).toMatch(UUID);
  });
});
