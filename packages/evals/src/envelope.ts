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
 * Accounting is integer micro-USD, so exact fits pass: 0.1 + 0.2
 * against a 0.3 envelope is a fit, not a float rejection.
 */
import { ConfigError } from '@rulvar/core';

const MICRO = 1_000_000;

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
    this.maxMicroUsd = Math.round(maxTotalUsd * MICRO);
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
    const micro = Math.round(ceilingUsd * MICRO);
    if (this.authorizedMicroUsd + micro > this.maxMicroUsd) {
      throw new SweepBudgetError(runLabel, ceilingUsd, this.authorizedUsd, this.maxTotalUsd);
    }
    this.authorizedMicroUsd += micro;
  }
}
