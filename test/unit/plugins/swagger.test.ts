import { status } from 'http-status';
import { describe, expect, vi } from 'vitest';
import { test } from '../test.ts';

describe('swagger', () => {
  test('serves the api reference with a relaxed script policy', async ({ app }) => {
    const res = await app.inject({ method: 'GET', url: '/docs/' });

    expect(res.statusCode).toBe(status.OK);
    expect(res.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
  });

  test('keeps the strict script policy on api routes', async ({ app }) => {
    const res = await app.inject({ method: 'GET', url: '/todos' });

    expect(res.headers['content-security-policy']).toContain("script-src 'self';");
  });

  test('describes the routes in the openapi document', async ({ app }) => {
    expect(app.swagger().paths).toHaveProperty('/todos');
  });

  test('serves nothing when docs are disabled', async ({ createApp }) => {
    vi.stubEnv('DOCS_ENABLED', 'false');
    const app = await createApp();

    const res = await app.inject({ method: 'GET', url: '/docs/' });

    expect(res.statusCode).toBe(status.NOT_FOUND);
    expect(app.hasDecorator('swagger')).toBe(false);
  });
});
