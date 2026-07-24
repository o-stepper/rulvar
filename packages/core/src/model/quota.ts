/**
 * Quota rules and the in-process reference QuotaLimiter (RV-215).
 * The rule model is shared by every reference implementation
 * (memoryQuotaLimiter here, SqliteQuotaLimiter in
 * @rulvar/store-sqlite): fixed one-minute windows aligned to the
 * epoch, admission at reservation time, reconciliation to actual
 * usage inside the same window. The hard guarantee is on
 * `requestsPerMinute` (every wire attempt is exactly one request);
 * `tokensPerMinute` admits on the heuristic estimate and settles to
 * actual usage, so token windows are approximate at admission and
 * exact at settlement.
 *
 * Docs: https://docs.rulvar.com/guide/model-routing
 */
import { ConfigError } from '../l0/errors.js';
import type { QuotaDecision, QuotaLimiter, QuotaReservationRequest } from '../l0/spi/quota.js';
import type { Usage } from '../l0/messages.js';
import { requirePositiveInteger } from '../l0/validate-numbers.js';

/**
 * Captured at module load, before the InProcessRunner's
 * nondeterminism guard can patch the global: the limiter's clock is
 * engine infrastructure on the live-only dispatch path and must never
 * be blamed on workflow code.
 */
const nativeNow: () => number = Date.now;

/** The fixed accounting window every PerMinute cap counts over. */
export const QUOTA_WINDOW_MS = 60_000;

/**
 * One shared-quota rule. The dimension fields select which requests
 * the rule governs (an absent dimension matches every value); EVERY
 * matching rule must admit a request, and a grant consumes capacity
 * from each of them. The counters are rule-scoped: one rule matching
 * two models pools them under one cap; write one rule per model for
 * per-model buckets.
 */
export interface QuotaRule {
  /** Adapter id, as in `concurrency.perProvider` keys. */
  provider?: string;
  model?: string;
  tenant?: string;
  /** Wire attempts admitted per window; the exact, hard cap. */
  requestsPerMinute?: number;
  /**
   * Input plus output tokens admitted per window: estimated at
   * admission, reconciled to actual usage.
   */
  tokensPerMinute?: number;
}

/**
 * Validates a quota rule set as a typed ConfigError before any
 * limiter can admit under it: a non-array or empty set, a rule
 * without a cap, a malformed dimension, or a malformed cap all fail
 * loud at construction. Shared by every reference implementation.
 */
export function validateQuotaRules(rules: readonly QuotaRule[], site = 'quota rules'): void {
  const raw: unknown = rules;
  if (!Array.isArray(raw)) {
    throw new ConfigError(`${site} must be an array of QuotaRule objects`);
  }
  if (raw.length === 0) {
    throw new ConfigError(`${site} must contain at least one rule`);
  }
  raw.forEach((entry: unknown, index) => {
    const at = `${site}[${String(index)}]`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new ConfigError(`${at} must be a QuotaRule object`);
    }
    const rule = entry as Record<string, unknown>;
    for (const dimension of ['provider', 'model', 'tenant'] as const) {
      const value = rule[dimension];
      if (value !== undefined && (typeof value !== 'string' || value === '')) {
        throw new ConfigError(`${at}.${dimension} must be a nonempty string when given`);
      }
    }
    if (rule.requestsPerMinute === undefined && rule.tokensPerMinute === undefined) {
      throw new ConfigError(`${at} must set requestsPerMinute or tokensPerMinute (or both)`);
    }
    for (const cap of ['requestsPerMinute', 'tokensPerMinute'] as const) {
      if (rule[cap] !== undefined) {
        requirePositiveInteger(rule[cap] as number, `${at}.${cap}`);
      }
    }
  });
}

/** True when every dimension the rule pins matches the request. */
export function quotaRuleMatches(rule: QuotaRule, request: QuotaReservationRequest): boolean {
  return (
    (rule.provider === undefined || rule.provider === request.provider) &&
    (rule.model === undefined || rule.model === request.model) &&
    (rule.tenant === undefined || rule.tenant === request.tenant)
  );
}

/** The tokens a reservation is admitted under: input estimate plus the output cap. */
export function quotaEstimateTokens(request: QuotaReservationRequest): number {
  return request.estimate.inputTokens + (request.estimate.maxOutputTokens ?? 0);
}

/** The tokens a settled attempt actually consumed. */
export function quotaActualTokens(usage: Usage): number {
  return usage.inputTokens + usage.outputTokens;
}

/** Current-window counters of one rule bucket. */
export interface QuotaCounters {
  requests: number;
  tokens: number;
}

/**
 * One rule's admission verdict against its current-window counters,
 * the pure decision both reference implementations share. A denial
 * carries the window remainder as retryAfterMs, except when the
 * estimate alone can never fit the token cap: that denial says
 * retryAfterMs 0 (retry immediately), so the caller's bounded
 * attempts exhaust without waiting and failover gets its chance.
 */
export function quotaRuleAdmission(
  rule: QuotaRule,
  counters: QuotaCounters,
  estimate: QuotaCounters,
  msUntilWindowEnd: number,
): { admit: true } | { admit: false; retryAfterMs: number; reason: string } {
  if (
    rule.requestsPerMinute !== undefined &&
    counters.requests + estimate.requests > rule.requestsPerMinute
  ) {
    return {
      admit: false,
      retryAfterMs: msUntilWindowEnd,
      reason: `requestsPerMinute ${String(rule.requestsPerMinute)} exhausted`,
    };
  }
  if (rule.tokensPerMinute !== undefined) {
    if (estimate.tokens > rule.tokensPerMinute) {
      return {
        admit: false,
        retryAfterMs: 0,
        reason:
          `the estimate of ${String(estimate.tokens)} tokens can never fit ` +
          `tokensPerMinute ${String(rule.tokensPerMinute)}`,
      };
    }
    if (counters.tokens + estimate.tokens > rule.tokensPerMinute) {
      return {
        admit: false,
        retryAfterMs: msUntilWindowEnd,
        reason: `tokensPerMinute ${String(rule.tokensPerMinute)} exhausted`,
      };
    }
  }
  return { admit: true };
}

/**
 * Folds one more failing rule into the decision the caller returns:
 * the wait is the LONGEST failing horizon (every matching rule must
 * admit), and the FIRST failing rule names the denial.
 */
export function mergeQuotaDenial(
  current: { retryAfterMs: number; reason: string } | undefined,
  next: { retryAfterMs: number; reason: string },
): { retryAfterMs: number; reason: string } {
  if (current === undefined) {
    return { retryAfterMs: next.retryAfterMs, reason: next.reason };
  }
  return next.retryAfterMs > current.retryAfterMs
    ? { retryAfterMs: next.retryAfterMs, reason: current.reason }
    : current;
}

interface MemoryBucket {
  windowStart: number;
  requests: number;
  tokens: number;
}

interface MemoryReservation {
  windowStart: number;
  estimateTokens: number;
  ruleIndexes: number[];
}

/** One rule's live counters, exposed by `snapshot()` for telemetry. */
export interface QuotaWindowSnapshot {
  rule: QuotaRule;
  windowStart: number;
  requests: number;
  tokens: number;
}

/** The in-process reference QuotaLimiter returned by memoryQuotaLimiter. */
export interface MemoryQuotaLimiter extends QuotaLimiter {
  /** Current-window counters per rule; rolled-over windows read as zero. */
  snapshot(): QuotaWindowSnapshot[];
}

/**
 * The in-process reference QuotaLimiter: fixed epoch-aligned
 * one-minute windows over the shared rule model. Coordinates every
 * engine that shares THIS instance inside one process; processes
 * coordinate through a shared-storage implementation of the same SPI
 * (SqliteQuotaLimiter in @rulvar/store-sqlite) instead.
 */
export function memoryQuotaLimiter(
  rules: readonly QuotaRule[],
  options: { now?: () => number } = {},
): MemoryQuotaLimiter {
  validateQuotaRules(rules, 'memoryQuotaLimiter rules');
  const now = options.now ?? ((): number => nativeNow());
  const buckets = new Map<number, MemoryBucket>();
  const reservations = new Map<string, MemoryReservation>();
  let nextReservation = 0;

  const windowStartAt = (at: number): number => at - (at % QUOTA_WINDOW_MS);
  const bucketFor = (ruleIndex: number, windowStart: number): MemoryBucket => {
    let bucket = buckets.get(ruleIndex);
    if (bucket === undefined || bucket.windowStart !== windowStart) {
      bucket = { windowStart, requests: 0, tokens: 0 };
      buckets.set(ruleIndex, bucket);
    }
    return bucket;
  };
  const prune = (windowStart: number): void => {
    for (const [id, reservation] of reservations) {
      if (reservation.windowStart < windowStart) {
        reservations.delete(id);
      }
    }
  };

  return {
    reserve(request: QuotaReservationRequest): Promise<QuotaDecision> {
      const at = now();
      const windowStart = windowStartAt(at);
      prune(windowStart);
      const estimateTokens = quotaEstimateTokens(request);
      const msUntilWindowEnd = windowStart + QUOTA_WINDOW_MS - at;
      const matched: number[] = [];
      let denial: { retryAfterMs: number; reason: string } | undefined;
      rules.forEach((rule, index) => {
        if (!quotaRuleMatches(rule, request)) {
          return;
        }
        matched.push(index);
        const verdict = quotaRuleAdmission(
          rule,
          bucketFor(index, windowStart),
          { requests: request.estimate.requests, tokens: estimateTokens },
          msUntilWindowEnd,
        );
        if (!verdict.admit) {
          denial = mergeQuotaDenial(denial, verdict);
        }
      });
      if (denial !== undefined) {
        return Promise.resolve({ granted: false, ...denial });
      }
      for (const index of matched) {
        const bucket = bucketFor(index, windowStart);
        bucket.requests += request.estimate.requests;
        bucket.tokens += estimateTokens;
      }
      nextReservation += 1;
      const reservationId = `mq-${String(nextReservation)}`;
      reservations.set(reservationId, { windowStart, estimateTokens, ruleIndexes: matched });
      return Promise.resolve({ granted: true, reservationId });
    },

    reconcile(reservationId: string, usage: Usage): Promise<void> {
      const reservation = reservations.get(reservationId);
      if (reservation === undefined) {
        return Promise.resolve();
      }
      reservations.delete(reservationId);
      const windowStart = windowStartAt(now());
      if (reservation.windowStart !== windowStart) {
        // The window already rolled; the estimate aged out with it.
        return Promise.resolve();
      }
      const delta = quotaActualTokens(usage) - reservation.estimateTokens;
      for (const index of reservation.ruleIndexes) {
        const bucket = buckets.get(index);
        if (bucket !== undefined && bucket.windowStart === windowStart) {
          bucket.tokens = Math.max(0, bucket.tokens + delta);
        }
      }
      return Promise.resolve();
    },

    snapshot(): QuotaWindowSnapshot[] {
      const windowStart = windowStartAt(now());
      return rules.map((rule, index) => {
        const bucket = buckets.get(index);
        const current = bucket !== undefined && bucket.windowStart === windowStart;
        return {
          rule,
          windowStart,
          requests: current ? bucket.requests : 0,
          tokens: current ? bucket.tokens : 0,
        };
      });
    },
  };
}

/** createEngine quota config: the limiter plus its engine-scoped knobs. */
export interface EngineQuotaConfig {
  limiter: QuotaLimiter;
  /** Stamped on every reservation of this engine's runs. */
  tenant?: string;
  /**
   * What a limiter infrastructure FAILURE (reserve throwing) means:
   * 'deny' (default, fail closed) converts it into a retryable
   * transport-class denial; 'allow' logs a warning and dispatches
   * without a reservation. A limiter DENIAL is unaffected by this
   * knob. reconcile failures only ever warn.
   */
  onLimiterError?: 'deny' | 'allow';
}

/** The resolved engine-side quota runtime threaded into every run. */
export interface EngineQuotaRuntime {
  limiter: QuotaLimiter;
  tenant?: string;
  onLimiterError: 'deny' | 'allow';
}

/**
 * Validates createEngine's quota config as a typed ConfigError before
 * any run could dispatch under a malformed limiter (the intake
 * discipline every engine option follows).
 */
export function validateEngineQuotaConfig(
  config: EngineQuotaConfig | undefined,
  site = 'createEngine quota',
): void {
  if (config === undefined) {
    return;
  }
  const raw: unknown = config;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ConfigError(`${site} must be an object with a limiter`);
  }
  const candidate = raw as { limiter?: unknown; tenant?: unknown; onLimiterError?: unknown };
  const limiter = candidate.limiter as { reserve?: unknown; reconcile?: unknown } | undefined;
  if (
    typeof limiter !== 'object' ||
    limiter === null ||
    typeof limiter.reserve !== 'function' ||
    typeof limiter.reconcile !== 'function'
  ) {
    throw new ConfigError(
      `${site}.limiter must implement QuotaLimiter (reserve and reconcile functions)`,
    );
  }
  if (
    candidate.tenant !== undefined &&
    (typeof candidate.tenant !== 'string' || candidate.tenant === '')
  ) {
    throw new ConfigError(`${site}.tenant must be a nonempty string when given`);
  }
  if (
    candidate.onLimiterError !== undefined &&
    candidate.onLimiterError !== 'deny' &&
    candidate.onLimiterError !== 'allow'
  ) {
    throw new ConfigError(`${site}.onLimiterError must be 'deny' or 'allow' when given`);
  }
}
