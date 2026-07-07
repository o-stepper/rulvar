/**
 * Per-provider concurrency keys (M4-T07): a keyed limiter beside the
 * router, ENGINE-scoped (docs/06, section 4: keys constrain calls
 * across a single engine per adapter). The Appendix A default is
 * unlimited: an embeddable library must not surprise-throttle hosts, so
 * the per-run semaphore stays the only default bound and provider 429s
 * ride RetryPolicy; hosts with known tier limits opt in per adapter id
 * via createEngine concurrency.perProvider.
 *
 * There is deliberately NO distributed cross-process limiter: two
 * processes sharing one API key coordinate nothing here (a
 * process-global limiter is an open question, docs/14).
 */
import { Semaphore } from '../engine/scheduler.js';

export class KeyedLimiter {
  private readonly semaphores = new Map<string, Semaphore>();

  constructor(caps?: Record<string, number>) {
    for (const [key, limit] of Object.entries(caps ?? {})) {
      this.semaphores.set(key, new Semaphore(limit));
    }
  }

  /** Queue depth for one key (0 for unlimited keys); telemetry only. */
  pending(key: string): number {
    return this.semaphores.get(key)?.pending ?? 0;
  }

  /**
   * Runs `fn` under the key's semaphore; keys without a configured cap
   * run unlimited (no queueing, no overhead).
   */
  async withSlot<T>(key: string, fn: () => Promise<T>, onQueued?: () => void): Promise<T> {
    const semaphore = this.semaphores.get(key);
    if (semaphore === undefined) {
      return fn();
    }
    return semaphore.withSlot(fn, onQueued);
  }
}
