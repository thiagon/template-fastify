import { z } from 'zod';

export const todoParams = z.object({
  id: z.uuid(),
});

export const createTodoBody = z.object({
  title: z.string().min(1).max(120),
  done: z.boolean().default(false),
});

export const updateTodoBody = createTodoBody.partial();

export const listTodosQuery = z.object({
  done: z.stringbool().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const todo = z.object({
  id: z.uuid(),
  title: z.string(),
  done: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const todoList = z.object({
  items: z.array(todo),
  total: z.number().int(),
});

export const errorResponse = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type Todo = z.infer<typeof todo>;
export type CreateTodo = z.infer<typeof createTodoBody>;
export type UpdateTodo = z.infer<typeof updateTodoBody>;
export type ListTodosQuery = z.infer<typeof listTodosQuery>;
