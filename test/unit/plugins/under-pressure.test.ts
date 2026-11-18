import { status } from 'http-status';
import { describe, expect, vi } from 'vitest';
import { test } from '../test.ts';

describe('under pressure', () => {
  test('fails readiness when the event loop is saturated', async ({ app }) => {
    vi.spyOn(app, 'memoryUsage').mockReturnValue({
      heapUsed: 0,
      rssBytes: 0,
      eventLoopDelay: 0,
      eventLoopUtilized: 0.99,
    });

    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(status.SERVICE_UNAVAILABLE);
    expect(res.json()).toEqual({ status: 'unavailable', checks: { pressure: 'fail' } });
  });
});
