import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
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
        response: { 200: todoList },
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
        response: { 200: todo, 404: errorResponse },
      },
    },
    async req => {
      const found = await service.get(req.params.id);
      if (!found) throw app.httpErrors.notFound(`todo ${req.params.id} not found`);
      return found;
    },
  );

  route.post(
    '/todos',
    {
      schema: {
        tags: ['todos'],
        body: createTodoBody,
        response: { 201: todo, 400: errorResponse },
      },
    },
    async (req, reply) => {
      const created = await service.create(req.body);
      return reply.code(201).send(created);
    },
  );

  route.patch(
    '/todos/:id',
    {
      schema: {
        tags: ['todos'],
        params: todoParams,
        body: updateTodoBody,
        response: { 200: todo, 404: errorResponse },
      },
    },
    async req => {
      const updated = await service.update(req.params.id, req.body);
      if (!updated) throw app.httpErrors.notFound(`todo ${req.params.id} not found`);
      return updated;
    },
  );

  route.delete(
    '/todos/:id',
    {
      schema: {
        tags: ['todos'],
        params: todoParams,
        response: { 204: z.null(), 404: errorResponse },
      },
    },
    async (req, reply) => {
      const removed = await service.remove(req.params.id);
      if (!removed) throw app.httpErrors.notFound(`todo ${req.params.id} not found`);
      return reply.code(204).send(null);
    },
  );
}
