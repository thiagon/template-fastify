import { status } from 'http-status';
import { describe, expect } from 'vitest';
import { test } from '../test.ts';

describe('metrics', () => {
  test('exposes route durations in prometheus format', async ({ app }) => {
    await app.inject({ method: 'GET', url: '/todos' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });

    expect(res.statusCode).toBe(status.OK);
    expect(res.headers['content-type']).toMatch(/^text\/plain/);
    expect(res.body).toMatch(/http_request_duration_seconds_count\{[^}]*route="\/todos"/);
    expect(res.body).not.toMatch(/^http_request_summary_seconds/m);
  });

  test('does not record probes or the scrape itself', async ({ app }) => {
    await app.inject({ method: 'GET', url: '/health/live' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });

    expect(res.body).not.toMatch(/route="\/health\/live"/);
    expect(res.body).not.toMatch(/route="\/metrics"/);
  });
});
