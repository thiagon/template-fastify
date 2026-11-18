import { status } from 'http-status';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../../helpers/app.ts';

describe('health routes', () => {
  it('answers liveness with the service identity', async () => {
    await using app = await createTestApp();

    const res = await app.inject({ method: 'GET', url: '/health/live' });

    expect(res.statusCode).toBe(status.OK);
    expect(res.json()).toMatchObject({
      status: 'ok',
      service: 'fastify-template',
      version: '0.0.1',
    });
  });

  it('is ready when every check passes', async () => {
    await using app = await createTestApp(instance => {
      instance.register(async scoped => {
        scoped.readiness.add('db', async () => {});
      });
    });

    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(status.OK);
    expect(res.json()).toEqual({ status: 'ok', checks: { pressure: 'ok', db: 'ok' } });
  });

  it('is unavailable when a check fails', async () => {
    await using app = await createTestApp(instance => {
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

  it('rejects duplicate check names', async () => {
    await using app = await createTestApp();

    expect(() => app.readiness.add('pressure', () => {})).toThrow(/already registered/);
  });
});
