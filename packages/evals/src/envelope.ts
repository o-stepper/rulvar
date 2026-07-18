/**
 * The debit-only aggregate spend envelope (v1.16.2 review P1-2). A
 * sweep multiplies paid runs: pool members times cases for targets,
 * one judge run per GraderContext.judge call, one canary run per
 * probe per member, and the falsification union can grow the pool
 * beyond the config. Per-run ceilings alone do not bound that
 * product, so the envelope authorizes each run's IMMUTABLE ceiling
 * BEFORE the run starts: a run whose ceiling does not fit the
 * remainder is refused before any provider work.
 *
 * Authorizations are never returned: not when a run completes under
 * its ceiling, not on CAS retries (they run no paid work), and not on
 * replay. A replayed run authorizes exactly like a fresh one and then
 * spends nothing; the envelope bounds the authorized worst case, not
 * the observed spend, so replay never double-PAYS anything while the
 * accounting stays one-directional. The envelope lives for one
 * invocation and is never persisted.
 *
 * Accounting is integer micro-USD and conservative at the
 * representation boundary (v1.17.0 review P1-4, hardened by the v1.18.0
 * review P1-4): the cap converts DOWN (floor), every debit converts UP
 * (ceil), only ULP-scale representation noise may snap to the
 * neighboring integer, amounts outside the safe integer micro-USD
 * domain are rejected, and a cap below one micro-USD is rejected
 * outright, so for any admitted sequence the sum of the ORIGINAL
 * ceilings can never exceed maxTotalUsd and no positive ceiling ever
 * debits zero. Amounts that are integer micro-USD up to float noise
 * stay exact, so 0.1 + 0.2 against a 0.3 envelope is a fit, not a
 * float rejection.
 */
import { ConfigError } from '@rulvar/core';

const MICRO = 1_000_000;

/**
 * Directed-rounding snap window, in ULPs of the product `usd * 1e6`:
 * only genuine IEEE-754 representation noise may snap to the neighboring
 * integer (0.3 * 1e6 is 299999.99999999994, about 6e-11 away, and MUST
 * count as 300000), while a genuinely sub-micro fraction like 0.4 must
 * round in the conservative direction. The window scales with the ULP,
 * never with a relative fraction of the amount: the v1.17.0 fix used a
 * 1e-6 RELATIVE tolerance, which already reaches half a micro-USD at
 * $0.50 and turned directed rounding into round-to-nearest, admitting
 * aggregates above the cap (v1.18.0 review P1-4).
 */
const SNAP_ULPS = 4;

function microOf(usd: number, direction: 'floor' | 'ceil'): number {
  const raw = usd * MICRO;
  const nearest = Math.round(raw);
  if (Math.abs(raw - nearest) <= SNAP_ULPS * Math.abs(raw) * Number.EPSILON) {
    return nearest;
  }
  return direction === 'floor' ? Math.floor(raw) : Math.ceil(raw);
}

/**
 * The accounting domain is integer micro-USD within Number's safe
 * integer range (up to about $9.007e9). Outside it (Number.MAX_VALUE
 * caps overflow to Infinity, huge finite amounts lose integer
 * precision) the envelope arithmetic silently degrades: Infinity plus
 * anything compares false against Infinity and every authorization
 * would be admitted with remainingUsd NaN (v1.18.0 review P1-4), so
 * out-of-domain amounts are rejected up front.
 */
function requireSafeMicro(micro: number, what: string, usd: number): number {
  if (!Number.isSafeInteger(micro)) {
    throw new ConfigError(
      `${what} ${String(usd)} USD is outside the safe integer micro-USD accounting domain ` +
        '(at most $9007199254.740991)',
    );
  }
  return micro;
}

/** Thrown when authorizing a run's ceiling would exceed the envelope. */
export class SweepBudgetError extends Error {
  /** What was about to start, e.g. `eval target 'sweep-math'`. */
  readonly runLabel: string;
  /** The per-run ceiling that did not fit. */
  readonly ceilingUsd: number;
  /** Total already authorized before this refusal. */
  readonly authorizedUsd: number;
  readonly maxTotalUsd: number;
  constructor(runLabel: string, ceilingUsd: number, authorizedUsd: number, maxTotalUsd: number) {
    super(
      `sweep envelope exhausted: authorizing $${String(ceilingUsd)} for ${runLabel} would ` +
        `exceed maxTotalUsd $${String(maxTotalUsd)} ($${String(authorizedUsd)} already ` +
        'authorized); the run was refused before any provider call',
    );
    this.name = 'SweepBudgetError';
    this.runLabel = runLabel;
    this.ceilingUsd = ceilingUsd;
    this.authorizedUsd = authorizedUsd;
    this.maxTotalUsd = maxTotalUsd;
  }
}

/**
 * One envelope bounds one whole sweep invocation: share the instance
 * across the canary loop and runSweepMatrix so canary, target, and
 * judge runs all draw from the same remainder.
 */
export class SpendEnvelope {
  readonly maxTotalUsd: number;
  private readonly maxMicroUsd: number;
  private authorizedMicroUsd = 0;

  constructor(maxTotalUsd: number) {
    if (!Number.isFinite(maxTotalUsd) || maxTotalUsd <= 0) {
      throw new ConfigError(
        `SpendEnvelope maxTotalUsd must be a positive finite number, got ${String(maxTotalUsd)}`,
      );
    }
    this.maxTotalUsd = maxTotalUsd;
    // The cap converts DOWN: representation error may only tighten it.
    this.maxMicroUsd = requireSafeMicro(
      microOf(maxTotalUsd, 'floor'),
      'SpendEnvelope maxTotalUsd',
      maxTotalUsd,
    );
    if (this.maxMicroUsd < 1) {
      throw new ConfigError(
        `SpendEnvelope maxTotalUsd ${String(maxTotalUsd)} is below the 1 micro-USD ` +
          'accounting granularity ($0.000001); such an envelope could never admit a run',
      );
    }
  }

  /** Total authorized so far (debit-only; never decreases). */
  get authorizedUsd(): number {
    return this.authorizedMicroUsd / MICRO;
  }

  get remainingUsd(): number {
    return Math.max(0, this.maxMicroUsd - this.authorizedMicroUsd) / MICRO;
  }

  /**
   * Authorizes one run's immutable ceiling or throws SweepBudgetError.
   * An unbounded run cannot be authorized: under an envelope every run
   * MUST carry an explicit positive ceiling, otherwise the aggregate
   * bound would be unaccountable.
   */
  authorize(ceilingUsd: number | undefined, runLabel: string): void {
    if (ceilingUsd === undefined || !Number.isFinite(ceilingUsd) || ceilingUsd <= 0) {
      throw new ConfigError(
        `the spend envelope requires an explicit positive per-run ceiling for ${runLabel}; ` +
          `got ${String(ceilingUsd)} (an unbounded run under an aggregate envelope would be ` +
          'unaccountable)',
      );
    }
    // Every debit converts UP: a positive ceiling always debits at
    // least one micro-USD, so zero-debit authorizations cannot exist
    // and the admitted ORIGINAL ceilings always sum within the cap.
    const micro = requireSafeMicro(
      Math.max(1, microOf(ceilingUsd, 'ceil')),
      `per-run ceiling for ${runLabel}`,
      ceilingUsd,
    );
    if (this.authorizedMicroUsd + micro > this.maxMicroUsd) {
      throw new SweepBudgetError(runLabel, ceilingUsd, this.authorizedUsd, this.maxTotalUsd);
    }
    this.authorizedMicroUsd += micro;
  }
}
