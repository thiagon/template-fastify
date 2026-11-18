import type { FastifyInstance } from 'fastify';
import { status } from 'http-status';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../../helpers/app.ts';

describe('metrics', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes route durations in prometheus format', async () => {
    await app.inject({ method: 'GET', url: '/todos' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });

    expect(res.statusCode).toBe(status.OK);
    expect(res.headers['content-type']).toMatch(/^text\/plain/);
    expect(res.body).toMatch(/http_request_duration_seconds_count\{[^}]*route="\/todos"/);
    expect(res.body).not.toMatch(/^http_request_summary_seconds/m);
  });

  it('does not record probes or the scrape itself', async () => {
    await app.inject({ method: 'GET', url: '/health/live' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });

    expect(res.body).not.toMatch(/route="\/health\/live"/);
    expect(res.body).not.toMatch(/route="\/metrics"/);
  });
});
