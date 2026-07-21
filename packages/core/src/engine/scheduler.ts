/**
 * Scheduler and concurrency (M1-T08): the per-run semaphore with a FIFO
 * queue (default 12 concurrent model calls). The engine lifetime spawn cap
 * is enforced by the budget layer at admission; parallel/pipeline
 * composition semantics live with ctx.
 * Per-provider concurrency keys land with M4.
 */
import { requirePositiveInteger } from '../l0/validate-numbers.js';

/** FIFO semaphore; default per-run width is 12. */
export const DEFAULT_PER_RUN_CONCURRENCY = 12;

interface Waiter {
  resolve: () => void;
  aborted: boolean;
}

export class Semaphore {
  private readonly limit: number;
  private active = 0;
  private readonly waiters: Waiter[] = [];

  /**
   * `limit` must be a positive integer: anything else (NaN included) is
   * a typed ConfigError. Before this gate a NaN limit made
   * `active < limit` permanently false, so the first acquire queued
   * forever and the run could not settle, not even through cancel()
   * (v1.34.0 review P2-4). Unlimited is expressed by not constructing a
   * semaphore, never by a sentinel limit.
   */
  constructor(limit: number) {
    requirePositiveInteger(limit, 'Semaphore limit');
    this.limit = limit;
  }

  get pending(): number {
    return this.waiters.length;
  }

  /**
   * Acquires a slot, resolving in FIFO order. `onQueued` fires only when
   * the caller actually has to wait (feeds the agent:queued event).
   * An aborted `signal` releases the caller from the queue without a
   * slot: the returned release is a no-op, the remaining waiters keep
   * their FIFO positions, and the caller proceeds to observe its own
   * aborted signal (the model layers refuse dispatch under an aborted
   * signal, so no provider call follows). Cancellation can therefore
   * always drain a queued run (v1.34.0 review P2-4).
   */
  async acquire(onQueued?: () => void, signal?: AbortSignal): Promise<() => void> {
    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }
    if (signal?.aborted === true) {
      return () => undefined;
    }
    onQueued?.();
    const waiter: Waiter = { resolve: () => undefined, aborted: false };
    const wait = new Promise<void>((resolve) => {
      waiter.resolve = resolve;
    });
    this.waiters.push(waiter);
    let onAbort: (() => void) | undefined;
    if (signal !== undefined) {
      onAbort = () => {
        const index = this.waiters.indexOf(waiter);
        if (index === -1) {
          // Already granted (or already removed): the slot handoff won
          // the race and the caller's own abort handling takes over.
          return;
        }
        this.waiters.splice(index, 1);
        waiter.aborted = true;
        waiter.resolve();
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
    try {
      await wait;
    } finally {
      if (signal !== undefined && onAbort !== undefined) {
        signal.removeEventListener('abort', onAbort);
      }
    }
    if (waiter.aborted) {
      return () => undefined;
    }
    this.active += 1;
    return () => this.release();
  }

  async withSlot<T>(fn: () => Promise<T>, onQueued?: () => void, signal?: AbortSignal): Promise<T> {
    const release = await this.acquire(onQueued, signal);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private release(): void {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next !== undefined) {
      next.resolve();
    }
  }
}
