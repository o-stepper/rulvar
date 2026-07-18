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
 * representation boundary (v1.17.0 review P1-4): the cap converts DOWN
 * (floor), every debit converts UP (ceil), and a cap below one
 * micro-USD is rejected outright, so for any admitted sequence the sum
 * of the ORIGINAL ceilings can never exceed maxTotalUsd and no
 * positive ceiling ever debits zero. Amounts that are integer
 * micro-USD up to float noise stay exact, so 0.1 + 0.2 against a 0.3
 * envelope is a fit, not a float rejection.
 */
import { ConfigError } from '@rulvar/core';

const MICRO = 1_000_000;

/**
 * Relative tolerance for float noise around an integer micro-USD
 * amount: 0.3 * 1e6 is 299999.99999999994 and MUST count as 300000,
 * while a genuinely sub-micro 0.4 must not.
 */
const MICRO_NOISE = 1e-6;

function microOf(usd: number, direction: 'floor' | 'ceil'): number {
  const raw = usd * MICRO;
  const nearest = Math.round(raw);
  if (Math.abs(raw - nearest) <= MICRO_NOISE * Math.max(1, Math.abs(nearest))) {
    return nearest;
  }
  return direction === 'floor' ? Math.floor(raw) : Math.ceil(raw);
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
    this.maxMicroUsd = microOf(maxTotalUsd, 'floor');
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
    const micro = Math.max(1, microOf(ceilingUsd, 'ceil'));
    if (this.authorizedMicroUsd + micro > this.maxMicroUsd) {
      throw new SweepBudgetError(runLabel, ceilingUsd, this.authorizedUsd, this.maxTotalUsd);
    }
    this.authorizedMicroUsd += micro;
  }
}
