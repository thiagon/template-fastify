import { status } from 'http-status';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer, type TestServer } from '../../../helpers/server.ts';

describe('health over http', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('reports the service as live', async () => {
    const res = await fetch(`${server.baseUrl}/health/live`);

    expect(res.status).toBe(status.OK);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('reports the service as ready', async () => {
    const res = await fetch(`${server.baseUrl}/health/ready`);

    expect(res.status).toBe(status.OK);
    expect(await res.json()).toMatchObject({ status: 'ok', checks: { pressure: 'ok' } });
  });
});
