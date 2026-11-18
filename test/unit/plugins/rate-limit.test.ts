import { status } from 'http-status';
import { describe, expect, vi } from 'vitest';
import { test } from '../test.ts';

describe('rate limit', () => {
  test('answers with the error envelope once the limit is reached', async ({ createApp }) => {
    vi.stubEnv('RATE_LIMIT_MAX', '2');
    const app = await createApp(instance => {
      instance.register(async scoped => {
        scoped.get('/limited', async () => ({ ok: true }));
      });
    });
    await app.inject({ method: 'GET', url: '/limited' });
    await app.inject({ method: 'GET', url: '/limited' });
    const res = await app.inject({ method: 'GET', url: '/limited' });

    expect(res.statusCode).toBe(status.TOO_MANY_REQUESTS);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.json()).toMatchObject({ error: 'TooManyRequestsError' });
  });
});
