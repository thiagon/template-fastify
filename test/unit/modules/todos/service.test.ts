import { beforeEach, describe, expect, it } from 'vitest';
import { TodoService } from '../../../../src/modules/todos/service.ts';

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(() => {
    service = new TodoService();
  });

  it('creates a todo with an id and a creation timestamp', async () => {
    const created = await service.create({ title: 'write unit tests', done: false });

    expect(created).toMatchObject({ title: 'write unit tests', done: false });
    expect(created.id).toHaveLength(36);
    expect(Date.parse(created.createdAt)).not.toBeNaN();
  });

  it('returns null when getting an unknown id', async () => {
    expect(await service.get('missing')).toBeNull();
  });

  it('lists every todo when no filter is given', async () => {
    await service.create({ title: 'a', done: false });
    await service.create({ title: 'b', done: true });

    const result = await service.list({ limit: 20 });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it('filters by done', async () => {
    await service.create({ title: 'a', done: false });
    const done = await service.create({ title: 'b', done: true });

    const result = await service.list({ done: true, limit: 20 });

    expect(result.items).toEqual([done]);
    expect(result.total).toBe(1);
  });

  it('caps items by limit but keeps the unfiltered total', async () => {
    await service.create({ title: 'a', done: false });
    await service.create({ title: 'b', done: false });
    await service.create({ title: 'c', done: false });

    const result = await service.list({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it('merges the patch into the existing todo', async () => {
    const created = await service.create({ title: 'a', done: false });

    const updated = await service.update(created.id, { done: true });

    expect(updated).toMatchObject({ id: created.id, title: 'a', done: true });
    expect(updated?.createdAt).toBe(created.createdAt);
  });

  it('returns null when updating an unknown id', async () => {
    expect(await service.update('missing', { done: true })).toBeNull();
  });

  it('removes an existing todo once', async () => {
    const created = await service.create({ title: 'a', done: false });

    expect(await service.remove(created.id)).toBe(true);
    expect(await service.remove(created.id)).toBe(false);
    expect(await service.get(created.id)).toBeNull();
  });
});
