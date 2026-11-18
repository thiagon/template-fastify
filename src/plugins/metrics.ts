import type { FastifyInstance } from 'fastify';
import metrics from 'fastify-metrics';
import fp from 'fastify-plugin';

async function metricsPlugin(fastify: FastifyInstance) {
  await fastify.register(metrics.default, {
    clearRegisterOnInit: true,
    endpoint: {
      url: '/metrics',
      logLevel: 'warn',
      schema: { hide: true },
      config: { disableMetrics: true, otel: false },
    },
    routeMetrics: {
      enabled: { histogram: true, summary: false },
      overrides: {
        histogram: {
          buckets: [0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        },
      },
    },
  });
}

export default fp(metricsPlugin, { name: 'metrics' });
