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
import { ConfigError, type WireError } from '../l0/errors.js';
import { MAX_TIMER_DELAY_MS } from '../l0/validate-numbers.js';

/**
 * Captured at module load, before the InProcessRunner's nondeterminism
 * guard can patch the global: the engine's own jitter is journal
 * invisible and must never be blamed on workflow code.
 */
const nativeRandom: () => number = Math.random;

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

/*
 * The Node timer ceiling itself lives in l0/validate-numbers.ts and is
 * shared with the option validators, so every timer-backed knob names
 * the same bound.
 */

/** Bounds a delay to a finite nonnegative integer a Node timer can honor. */
function timerSafe(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) {
    return 0;
  }
  return Math.min(Math.round(ms), MAX_TIMER_DELAY_MS);
}

/** Bounded, terminal-safe rendering of a config value for error text. */
function renderConfigValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value).slice(0, 48);
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return String(value);
  }
  return Array.isArray(value) ? 'an array' : `a ${typeof value}`;
}

const RETRY_CLASSES: readonly string[] = [
  'transport',
  'rate-limit',
  'overloaded',
] satisfies readonly RetryClass[];

/**
 * Validates a RetryPolicy and throws a typed ConfigError naming the
 * offending field before any provider, journal, or store side effect
 * can happen under it (v1.29.0 review P2). The engine calls this
 * eagerly in createEngine for `defaults.retry` and every profile
 * retry, and again after the call > profile > engine precedence merge
 * of each agent call, so an invalid policy can never dispatch an
 * adapter. The contract:
 *
 * - `attempts` is a positive safe integer (total tries, the initial
 *   attempt included; the engine always makes the first try, so a
 *   zero-attempts policy has no meaning and is rejected).
 * - `backoff.initialMs` and `backoff.maxMs` are integers between 0 and
 *   2147483647 ms (the Node timer maximum). `maxMs` below `initialMs`
 *   is allowed: `maxMs` is a ceiling applied through `Math.min`, so
 *   the pair stays well defined.
 * - `backoff.factor` is a finite number above zero. A factor below 1
 *   is allowed and yields a decaying backoff.
 * - `backoff.jitter`, when given, is a boolean.
 * - `retryOn`, when given, is an array of unique values drawn from
 *   'transport' | 'rate-limit' | 'overloaded'. An empty array is
 *   allowed and disables retries.
 *
 * `source` names where the policy came from (an engine default, a
 * profile, or the call option) so the error points at the exact
 * config path.
 */
export function validateRetryPolicy(policy: RetryPolicy, source = 'retry'): void {
  const fail = (field: string, requirement: string, value: unknown): never => {
    throw new ConfigError(`${source}: ${field} ${requirement}; got ${renderConfigValue(value)}`);
  };
  // Read through unknown: the declared type promises numbers, but this
  // boundary exists exactly for the config that broke the promise.
  const raw: unknown = policy;
  if (typeof raw !== 'object' || raw === null) {
    throw new ConfigError(
      `${source}: a RetryPolicy must be an object; got ${renderConfigValue(raw)}`,
    );
  }
  const candidate = raw as { attempts?: unknown; backoff?: unknown; retryOn?: unknown };
  const attempts = candidate.attempts;
  if (typeof attempts !== 'number' || !Number.isSafeInteger(attempts) || attempts < 1) {
    fail(
      'attempts',
      'must be a positive safe integer (total tries, the initial attempt included)',
      attempts,
    );
  }
  const backoff = candidate.backoff;
  if (typeof backoff !== 'object' || backoff === null || Array.isArray(backoff)) {
    throw new ConfigError(
      `${source}: backoff must be an object with initialMs, factor, and maxMs; ` +
        `got ${renderConfigValue(backoff)}`,
    );
  }
  const { initialMs, factor, maxMs, jitter } = backoff as {
    initialMs?: unknown;
    factor?: unknown;
    maxMs?: unknown;
    jitter?: unknown;
  };
  for (const [field, value] of [
    ['backoff.initialMs', initialMs],
    ['backoff.maxMs', maxMs],
  ] as const) {
    if (
      typeof value !== 'number' ||
      !Number.isSafeInteger(value) ||
      value < 0 ||
      value > MAX_TIMER_DELAY_MS
    ) {
      fail(field, 'must be an integer between 0 and 2147483647 ms (the Node timer maximum)', value);
    }
  }
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0) {
    fail('backoff.factor', 'must be a finite number above zero', factor);
  }
  if (jitter !== undefined && typeof jitter !== 'boolean') {
    fail('backoff.jitter', 'must be a boolean when given', jitter);
  }
  const retryOn = candidate.retryOn;
  if (retryOn !== undefined) {
    if (!Array.isArray(retryOn)) {
      fail('retryOn', 'must be an array of retry classes when given', retryOn);
    }
    const seen = new Set<string>();
    for (const entry of retryOn as unknown[]) {
      if (typeof entry === 'string' && RETRY_CLASSES.includes(entry)) {
        if (seen.has(entry)) {
          fail('retryOn', 'must not repeat a retry class', entry);
        }
        seen.add(entry);
      } else {
        fail('retryOn', "must contain only 'transport', 'rate-limit', or 'overloaded'", entry);
      }
    }
  }
}

/**
 * The delay before retry number `retryIndex` (zero based: the delay
 * after the first failed attempt has index 0). A VALID provider
 * supplied retryAfterMs (finite and nonnegative) REPLACES the
 * computed delay (Appendix A); anything else (NaN, Infinity, a
 * negative) is ignored as adapter noise and the policy backoff
 * applies, so this boundary stays defensive against custom adapters
 * (v1.28.0 review P2). Jitter is equal jitter: half the backoff is
 * deterministic, half random, so a jittered delay never collapses to
 * zero. The result is always a finite nonnegative integer clamped to
 * the Node timer maximum (2147483647 ms).
 */
export function retryDelayMs(
  policy: RetryPolicy,
  retryIndex: number,
  retryAfterMs?: number,
  random: () => number = nativeRandom,
): number {
  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return timerSafe(retryAfterMs);
  }
  const { initialMs, factor, maxMs, jitter } = policy.backoff;
  const base = Math.min(maxMs, initialMs * factor ** retryIndex);
  if (jitter !== true) {
    return timerSafe(base);
  }
  return timerSafe(base / 2 + random() * (base / 2));
}
