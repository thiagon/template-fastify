import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import createError from 'http-errors';

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    max: fastify.env.RATE_LIMIT_MAX,
    timeWindow: fastify.env.RATE_LIMIT_WINDOW,
    errorResponseBuilder: (_request, context) =>
      createError.TooManyRequests(`rate limit exceeded, retry in ${context.after}`),
  });
}

export default fp(rateLimitPlugin, { name: 'rate-limit', dependencies: ['env'] });
