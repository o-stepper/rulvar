import { describe, expect, it } from 'vitest';

import { PlanWriteLock } from './write-lock.js';

const tick = async (): Promise<void> => {
  await Promise.resolve();
};

describe('PlanWriteLock (docs/07, 3.2; XF-07)', () => {
  it('serializes critical sections in strict FIFO acquisition order', async () => {
    const lock = new PlanWriteLock();
    const order: string[] = [];
    const enter = (name: string, delayTicks: number) =>
      lock.runExclusive(async () => {
        order.push(`${name}:in`);
        for (let i = 0; i < delayTicks; i += 1) {
          await tick();
        }
        order.push(`${name}:out`);
        return name;
      });
    const [a, b, c] = await Promise.all([enter('a', 3), enter('b', 0), enter('c', 1)]);
    expect([a, b, c]).toEqual(['a', 'b', 'c']);
    expect(order).toEqual(['a:in', 'a:out', 'b:in', 'b:out', 'c:in', 'c:out']);
  });

  it('reports isHeld only inside a critical section', async () => {
    const lock = new PlanWriteLock();
    expect(lock.isHeld).toBe(false);
    await lock.runExclusive(() => {
      expect(lock.isHeld).toBe(true);
    });
    expect(lock.isHeld).toBe(false);
  });

  it('propagates a rejection to its caller without poisoning the queue', async () => {
    const lock = new PlanWriteLock();
    const failing = lock.runExclusive(() => {
      throw new Error('rebase exploded');
    });
    await expect(failing).rejects.toThrow('rebase exploded');
    await expect(lock.runExclusive(() => 'still-works')).resolves.toBe('still-works');
    expect(lock.isHeld).toBe(false);
  });

  it('supports synchronous critical sections', async () => {
    const lock = new PlanWriteLock();
    await expect(lock.runExclusive(() => 42)).resolves.toBe(42);
  });
});
