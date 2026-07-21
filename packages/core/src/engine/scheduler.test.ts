import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { Semaphore } from './scheduler.js';

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('Semaphore limit validation (v1.34.0 review P2-4)', () => {
  it.each([Number.NaN, 0, -1, 1.5, Number.POSITIVE_INFINITY])(
    'refuses limit %s with a typed ConfigError',
    (limit) => {
      expect(() => new Semaphore(limit)).toThrow(ConfigError);
      expect(() => new Semaphore(limit)).toThrow(/Semaphore limit must be a positive integer/);
    },
  );

  it('accepts a positive integer limit', () => {
    expect(new Semaphore(1).pending).toBe(0);
  });
});

describe('Semaphore abort-aware acquire (v1.34.0 review P2-4)', () => {
  it('an aborted queued waiter leaves the FIFO without a slot and later waiters keep order', async () => {
    const semaphore = new Semaphore(1);
    const releaseA = await semaphore.acquire();
    const abortB = new AbortController();
    const order: string[] = [];
    const b = semaphore.acquire(undefined, abortB.signal).then((release) => {
      order.push('b');
      return release;
    });
    const c = semaphore.acquire().then((release) => {
      order.push('c');
      return release;
    });
    await tick();
    expect(semaphore.pending).toBe(2);
    abortB.abort();
    const releaseB = await b;
    expect(order).toEqual(['b']);
    expect(semaphore.pending).toBe(1);
    // B got a no-op release, not the slot: C is still queued behind A.
    releaseB();
    await tick();
    expect(order).toEqual(['b']);
    releaseA();
    const releaseC = await c;
    expect(order).toEqual(['b', 'c']);
    releaseC();
    // The slot is free again after the chain drains.
    const releaseD = await semaphore.acquire();
    releaseD();
  });

  it('a signal already aborted at acquire time returns a no-op release without queueing', async () => {
    const semaphore = new Semaphore(1);
    const releaseA = await semaphore.acquire();
    const aborted = new AbortController();
    aborted.abort();
    let queued = false;
    const release = await semaphore.acquire(() => {
      queued = true;
    }, aborted.signal);
    expect(queued).toBe(false);
    expect(semaphore.pending).toBe(0);
    release();
    // A still holds the only real slot.
    let bGranted = false;
    const b = semaphore.acquire().then((releaseB) => {
      bGranted = true;
      return releaseB;
    });
    await tick();
    expect(bGranted).toBe(false);
    releaseA();
    (await b)();
  });

  it('an abort AFTER the slot handoff keeps the granted slot working', async () => {
    const semaphore = new Semaphore(1);
    const releaseA = await semaphore.acquire();
    const abortB = new AbortController();
    const b = semaphore.acquire(undefined, abortB.signal);
    await tick();
    releaseA();
    const releaseB = await b;
    // The handoff already happened; a late abort must not corrupt the
    // accounting or double-release.
    abortB.abort();
    let cGranted = false;
    const c = semaphore.acquire().then((releaseC) => {
      cGranted = true;
      return releaseC;
    });
    await tick();
    expect(cGranted).toBe(false);
    releaseB();
    (await c)();
  });

  it('withSlot under an aborted signal still runs fn (the model layers refuse dispatch themselves)', async () => {
    const semaphore = new Semaphore(1);
    const releaseA = await semaphore.acquire();
    const abort = new AbortController();
    let ran = false;
    const pending = semaphore.withSlot(
      () => {
        ran = true;
        return Promise.resolve('done');
      },
      undefined,
      abort.signal,
    );
    await tick();
    expect(ran).toBe(false);
    abort.abort();
    await expect(pending).resolves.toBe('done');
    expect(ran).toBe(true);
    releaseA();
  });
});
