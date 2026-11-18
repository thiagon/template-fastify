import { status } from 'http-status';
import { describe, expect } from 'vitest';
import { test } from '../../test.ts';

describe('health over http', () => {
  test('reports the service as live', async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/health/live`);

    expect(res.status).toBe(status.OK);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  test('reports the service as ready', async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/health/ready`);

    expect(res.status).toBe(status.OK);
    expect(await res.json()).toMatchObject({ status: 'ok', checks: { pressure: 'ok' } });
  });
});
