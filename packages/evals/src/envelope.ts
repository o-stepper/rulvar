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
 * representation boundary (v1.17.0 review P1-4, hardened by the
 * v1.18.0 review P1-4 and the v1.19.0 review P1-3): the cap converts
 * DOWN (floor), every debit converts UP (ceil), only ULP-scale
 * representation noise may snap to the neighboring integer, amounts at
 * or above 2^49 micro-USD (about $563M, where the noise window would
 * reach half a micro and the nearest integer would stop being unique)
 * are rejected, and a cap below one micro-USD is rejected outright.
 *
 * The exact input interpretation: every USD amount is a JavaScript
 * double, and the envelope interprets a double within SNAP_ULPS ULPs
 * of an integer micro value AS that integer; anything farther rounds
 * in the conservative direction. Under that interpretation the sum of
 * admitted ceilings can never exceed maxTotalUsd, and no positive
 * ceiling ever debits zero. The honest raw-double bound: each admitted
 * amount's double may sit below its interpreted integer by at most the
 * noise window (4 ULPs, always under half a micro in-domain), so the
 * sum of raw doubles can exceed the cap by at most half a micro-USD
 * per admitted amount; distinguishing finer than that is impossible in
 * double precision at the top of the domain. Amounts that are integer
 * micro-USD up to float noise stay exact, so 0.1 + 0.2 against a 0.3
 * envelope is a fit, not a float rejection.
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
 * The accounting domain is integer micro-USD strictly below 2^49
 * (at most $562,949,953.421311). Two limits meet there. Outside the
 * safe integer range the arithmetic silently degrades: a
 * Number.MAX_VALUE cap overflowed to Infinity and admitted EVERYTHING
 * with remainingUsd NaN (v1.18.0 review P1-4). Well before that, from
 * 2^49 micro upward, the SNAP_ULPS window reaches half a micro-USD:
 * the nearest integer stops being unique and the snap absorbs genuine
 * sub-micro remainders, so a ceil debit could round DOWN and admit an
 * aggregate whose raw doubles sum above the cap by more than the
 * documented noise bound (v1.19.0 review P1-3). Below 2^49 the window
 * stays strictly under half a micro, the snap target is unique, and
 * only representation noise is absorbed. Out-of-domain amounts are
 * rejected up front.
 */
const MAX_MICRO_EXCLUSIVE = 2 ** 49;

function requireDomainMicro(micro: number, what: string, usd: number): number {
  if (!Number.isSafeInteger(micro) || micro >= MAX_MICRO_EXCLUSIVE) {
    throw new ConfigError(
      `${what} ${String(usd)} USD is outside the micro-USD accounting domain ` +
        '(at most $562949953.421311)',
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
    this.maxMicroUsd = requireDomainMicro(
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
    const micro = requireDomainMicro(
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
