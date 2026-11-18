import fp from 'fastify-plugin';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { status } from 'http-status';
import { z } from 'zod';

const liveResponse = z.object({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
  uptime: z.number(),
});

const readyResponse = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.record(z.string(), z.enum(['ok', 'fail'])),
});

export default fp(
  async app => {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
      '/health/live',
      {
        logLevel: 'warn',
        config: { disableMetrics: true, otel: false },
        schema: {
          tags: ['health'],
          response: { [status.OK]: liveResponse },
        },
      },
      async () => ({
        status: 'ok' as const,
        service: app.env.SERVICE_NAME,
        version: app.env.SERVICE_VERSION,
        uptime: process.uptime(),
      }),
    );

    route.get(
      '/health/ready',
      {
        logLevel: 'warn',
        config: { disableMetrics: true, otel: false },
        schema: {
          tags: ['health'],
          response: { [status.OK]: readyResponse, [status.SERVICE_UNAVAILABLE]: readyResponse },
        },
      },
      async (_req, reply) => {
        const checks = await app.readiness.run();
        const ready = Object.values(checks).every(check => check === 'ok');
        return reply
          .code(ready ? status.OK : status.SERVICE_UNAVAILABLE)
          .send({ status: ready ? 'ok' : 'unavailable', checks });
      },
    );
  },
  { name: 'health', dependencies: ['env', 'readiness'] },
);
