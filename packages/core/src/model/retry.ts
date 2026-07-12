/**
 * Transport RetryPolicy (M4-T05): retries live UNDER the journal. A
 * retried-then-successful call is exactly one journal entry with one
 * usage total, transport retries never count as lineage attempts
 * (DEF-3), the provider-supplied retryAfterMs replaces the computed
 * delay, and task-class failures never retry by construction (a
 * non-retryable WireError has no retry class).
 *
 * Full contract: https://docs.rulvar.com/guide/model-routing; the
 * Appendix A defaults were committed at the M4 entry gate.
 */
import type { WireError } from '../l0/errors.js';

export type RetryClass = 'transport' | 'rate-limit' | 'overloaded';

export interface RetryPolicy {
  /** Total tries per serving model, the initial attempt included. */
  attempts: number;
  backoff: { initialMs: number; factor: number; maxMs: number; jitter?: boolean };
  /** Classes that retry; absent = the Appendix A default set. */
  retryOn?: RetryClass[];
}

/** Appendix A committed defaults (M4 entry gate, PR #26). */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  attempts: 3,
  backoff: { initialMs: 500, factor: 2, maxMs: 8000, jitter: true },
  retryOn: ['transport', 'rate-limit', 'overloaded'],
};

/**
 * Classifies a WireError for the retry engine. Task-class failures are
 * never retryable by construction: adapters mark them retryable: false
 * and this returns undefined. The kind travels in WireError.data.kind;
 * anything retryable without a specific kind is transport.
 */
export function retryClassOf(error: WireError): RetryClass | undefined {
  if (!error.retryable) {
    return undefined;
  }
  const kind = (error.data as { kind?: unknown } | undefined)?.kind;
  if (kind === 'rate-limit' || error.code === 'rate-limit') {
    return 'rate-limit';
  }
  if (kind === 'overloaded') {
    return 'overloaded';
  }
  return 'transport';
}

/**
 * The delay before retry number `retryIndex` (0-based: the delay after
 * the first failed attempt has index 0). A provider-supplied
 * retryAfterMs REPLACES the computed delay (Appendix A). Jitter is
 * equal-jitter: half the backoff is deterministic, half random, so a
 * jittered delay never collapses to zero.
 */
export function retryDelayMs(
  policy: RetryPolicy,
  retryIndex: number,
  retryAfterMs?: number,
  random: () => number = Math.random,
): number {
  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }
  const { initialMs, factor, maxMs, jitter } = policy.backoff;
  const base = Math.min(maxMs, initialMs * factor ** retryIndex);
  if (jitter !== true) {
    return base;
  }
  return base / 2 + random() * (base / 2);
}
