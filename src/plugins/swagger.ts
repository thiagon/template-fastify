import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

async function swaggerPlugin(fastify: FastifyInstance) {
  if (!fastify.env.DOCS_ENABLED) return;

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: fastify.env.SERVICE_NAME,
        version: fastify.env.SERVICE_VERSION,
      },
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(scalar, {
    routePrefix: '/docs',
    configuration: {
      pageTitle: fastify.env.SERVICE_NAME,
      agent: { disabled: true },
      telemetry: false,
    },
    hooks: {
      onRequest: (_request, reply, done) => {
        reply.helmet({
          contentSecurityPolicy: {
            directives: { scriptSrc: ["'self'", "'unsafe-inline'"] },
          },
        });
        done();
      },
    },
  });
}

export default fp(swaggerPlugin, { name: 'swagger', dependencies: ['env', 'helmet'] });
