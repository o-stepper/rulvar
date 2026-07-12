/**
 * PlanWriteLock (M7-T01): the in-process FIFO mutex serializing live
 * appends to the sequential scope "plan".
 *
 * Owning contract: https://docs.rulvar.com/guide/adaptive-orchestration
 * (DEF-8, XF-07). The lock serializes ONLY plan-scope appends (acquire,
 * read the fold head, evaluate, append, release); it MUST NOT substitute
 * for resolution arbitration, which is owned by the ResolutionArbiter
 * (DEF-4). In queue mode
 * the lease fencing epoch applies on top. Wall clock influences only
 * WHICH order gets recorded live; replay reads the recorded order and
 * never takes the lock.
 */

export class PlanWriteLock {
  private tail: Promise<void> = Promise.resolve();
  private held = false;

  /** True while a critical section is running (diagnostics only). */
  get isHeld(): boolean {
    return this.held;
  }

  /**
   * Runs `fn` exclusively, in strict acquisition (FIFO) order. The lock
   * releases on settlement either way; a rejection propagates to THIS
   * caller and never poisons later acquisitions.
   */
  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const turn = this.tail.then(async () => {
      this.held = true;
      try {
        return await fn();
      } finally {
        this.held = false;
      }
    });
    this.tail = turn.then(
      () => undefined,
      () => undefined,
    );
    return turn;
  }
}
