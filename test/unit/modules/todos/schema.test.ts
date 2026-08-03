import { describe, expect, it } from 'vitest';
import {
  createTodoBody,
  listTodosQuery,
  todoParams,
  updateTodoBody,
} from '../../../../src/modules/todos/schema.ts';

describe('createTodoBody', () => {
  it('defaults done to false', () => {
    expect(createTodoBody.parse({ title: 'a' })).toEqual({ title: 'a', done: false });
  });

  it('rejects an empty title', () => {
    const result = createTodoBody.safeParse({ title: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['title']);
  });

  it('rejects a title longer than 120 chars', () => {
    expect(createTodoBody.safeParse({ title: 'x'.repeat(121) }).success).toBe(false);
  });
});

describe('updateTodoBody', () => {
  it('accepts a partial payload', () => {
    expect(updateTodoBody.parse({ done: true })).toEqual({ done: true });
  });

  it('still validates the fields it receives', () => {
    expect(updateTodoBody.safeParse({ title: '' }).success).toBe(false);
  });
});

describe('listTodosQuery', () => {
  it('defaults limit to 20 and leaves done undefined', () => {
    expect(listTodosQuery.parse({})).toEqual({ limit: 20 });
  });

  it('coerces the querystring values', () => {
    expect(listTodosQuery.parse({ done: 'true', limit: '5' })).toEqual({ done: true, limit: 5 });
  });

  it('rejects a limit outside the allowed range', () => {
    expect(listTodosQuery.safeParse({ limit: '0' }).success).toBe(false);
    expect(listTodosQuery.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('todoParams', () => {
  it('requires a uuid', () => {
    expect(todoParams.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(todoParams.safeParse({ id: '00000000-0000-4000-8000-000000000000' }).success).toBe(true);
  });
});
