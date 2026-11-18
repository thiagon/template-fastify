import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import createError from 'http-errors';
import { status } from 'http-status';
import { z } from 'zod';
import {
  createTodoBody,
  errorResponse,
  listTodosQuery,
  todo,
  todoList,
  todoParams,
  updateTodoBody,
} from './schema.ts';
import type { TodoService } from './service.ts';

export function registerTodoRoutes(app: FastifyInstance, service: TodoService): void {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    '/todos',
    {
      schema: {
        tags: ['todos'],
        summary: 'List todos',
        querystring: listTodosQuery,
        response: { [status.OK]: todoList },
      },
    },
    async req => service.list(req.query),
  );

  route.get(
    '/todos/:id',
    {
      schema: {
        tags: ['todos'],
        params: todoParams,
        response: { [status.OK]: todo, [status.NOT_FOUND]: errorResponse },
      },
    },
    async req => {
      const found = await service.get(req.params.id);
      if (!found) throw createError.NotFound(`todo ${req.params.id} not found`);
      return found;
    },
  );

  route.post(
    '/todos',
    {
      schema: {
        tags: ['todos'],
        body: createTodoBody,
        response: { [status.CREATED]: todo, [status.BAD_REQUEST]: errorResponse },
      },
    },
    async (req, reply) => {
      const created = await service.create(req.body);
      return reply.code(status.CREATED).send(created);
    },
  );

  route.patch(
    '/todos/:id',
    {
      schema: {
        tags: ['todos'],
        params: todoParams,
        body: updateTodoBody,
        response: { [status.OK]: todo, [status.NOT_FOUND]: errorResponse },
      },
    },
    async req => {
      const updated = await service.update(req.params.id, req.body);
      if (!updated) throw createError.NotFound(`todo ${req.params.id} not found`);
      return updated;
    },
  );

  route.delete(
    '/todos/:id',
    {
      schema: {
        tags: ['todos'],
        params: todoParams,
        response: { [status.NO_CONTENT]: z.null(), [status.NOT_FOUND]: errorResponse },
      },
    },
    async (req, reply) => {
      const removed = await service.remove(req.params.id);
      if (!removed) throw createError.NotFound(`todo ${req.params.id} not found`);
      return reply.code(status.NO_CONTENT).send(null);
    },
  );
}
