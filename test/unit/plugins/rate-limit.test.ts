import type { FastifyInstance } from 'fastify';
import { status } from 'http-status';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../../helpers/app.ts';

describe('rate limit', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubEnv('RATE_LIMIT_MAX', '2');
    app = await createTestApp(instance => {
      instance.register(async scoped => {
        scoped.get('/limited', async () => ({ ok: true }));
      });
    });
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('answers with the error envelope once the limit is reached', async () => {
    await app.inject({ method: 'GET', url: '/limited' });
    await app.inject({ method: 'GET', url: '/limited' });
    const res = await app.inject({ method: 'GET', url: '/limited' });

    expect(res.statusCode).toBe(status.TOO_MANY_REQUESTS);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.json()).toMatchObject({ error: 'TooManyRequestsError' });
  });
});
