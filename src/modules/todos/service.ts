import { randomUUID } from 'node:crypto';
import type { CreateTodo, ListTodosQuery, Todo, UpdateTodo } from './schema.ts';

export class TodoService {
  private readonly todos = new Map<string, Todo>();

  async list(query: ListTodosQuery): Promise<{ items: Todo[]; total: number }> {
    const all = [...this.todos.values()].filter(
      t => query.done === undefined || t.done === query.done,
    );
    return { items: all.slice(0, query.limit), total: all.length };
  }

  async get(id: string): Promise<Todo | null> {
    return this.todos.get(id) ?? null;
  }

  async create(input: CreateTodo): Promise<Todo> {
    const created: Todo = {
      id: randomUUID(),
      title: input.title,
      done: input.done,
      createdAt: new Date().toISOString(),
    };
    this.todos.set(created.id, created);
    return created;
  }

  async update(id: string, input: UpdateTodo): Promise<Todo | null> {
    const current = this.todos.get(id);
    if (!current) return null;

    const updated: Todo = { ...current, ...input };
    this.todos.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.todos.delete(id);
  }
}
