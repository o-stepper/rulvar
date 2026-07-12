/**
 * Scheduler and concurrency (M1-T08): the per-run semaphore with a FIFO
 * queue (default 12 concurrent model calls). The engine lifetime spawn cap
 * is enforced by the budget layer at admission; parallel/pipeline
 * composition semantics live with ctx.
 * Per-provider concurrency keys land with M4.
 */

/** FIFO semaphore; default per-run width is 12. */
export const DEFAULT_PER_RUN_CONCURRENCY = 12;

export class Semaphore {
  private readonly limit: number;
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(limit: number) {
    this.limit = Math.max(1, limit);
  }

  get pending(): number {
    return this.waiters.length;
  }

  /**
   * Acquires a slot, resolving in FIFO order. `onQueued` fires only when
   * the caller actually has to wait (feeds the agent:queued event).
   */
  async acquire(onQueued?: () => void): Promise<() => void> {
    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }
    onQueued?.();
    await new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
    this.active += 1;
    return () => this.release();
  }

  async withSlot<T>(fn: () => Promise<T>, onQueued?: () => void): Promise<T> {
    const release = await this.acquire(onQueued);
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
      next();
    }
  }
}
