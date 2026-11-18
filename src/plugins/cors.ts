import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, { origin: fastify.env.CORS_ORIGIN });
}

export default fp(corsPlugin, { name: 'cors', dependencies: ['env'] });
