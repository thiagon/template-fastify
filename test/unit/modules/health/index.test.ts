import { status } from 'http-status';
import { describe, expect, vi } from 'vitest';
import { test } from '../../test.ts';

describe('health routes', () => {
  test('answers liveness with the service identity', async ({ app }) => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });

    expect(res.statusCode).toBe(status.OK);
    expect(res.json()).toMatchObject({
      status: 'ok',
      service: 'fastify-template',
      version: '0.0.1',
    });
  });

  test('is ready when every check passes', async ({ createApp }) => {
    const app = await createApp(instance => {
      instance.register(async scoped => {
        scoped.readiness.add('db', async () => {});
      });
    });

    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(status.OK);
    expect(res.json()).toEqual({ status: 'ok', checks: { pressure: 'ok', db: 'ok' } });
  });

  test('is unavailable when a check fails', async ({ createApp }) => {
    const app = await createApp(instance => {
      instance.register(async scoped => {
        scoped.readiness.add('db', async () => {
          throw new Error('connection refused');
        });
      });
    });

    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(status.SERVICE_UNAVAILABLE);
    expect(res.json()).toEqual({ status: 'unavailable', checks: { pressure: 'ok', db: 'fail' } });
  });

  test('rejects duplicate check names', async ({ app }) => {
    expect(() => app.readiness.add('pressure', () => {})).toThrow(/already registered/);
  });

  test('is never rate limited', async ({ createApp }) => {
    vi.stubEnv('RATE_LIMIT_MAX', '1');
    const app = await createApp();

    for (const url of ['/health/live', '/health/live', '/health/ready', '/health/ready']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(status.OK);
    }
  });
});
