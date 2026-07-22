/**
 * Strict all-children-success (cookbook recipe; the rendered
 * walk-through is https://docs.rulvar.com/guide/cookbook). Run status
 * `ok` proves only that finish validated; the acceptance policy makes
 * child success part of the contract. A satisfied policy returns the
 * acceptance envelope; a violated one fails the run with a typed error
 * this recipe knows how to read from the public run outcome.
 */
import type { OrchestrateOptions, WireError } from '@rulvar/core';

/** Every spawned child must settle ok, or the run fails typed. */
export function strictSuccessOptions(): OrchestrateOptions {
  return { acceptance: { childPolicy: 'all-ok' } };
}

/** The acceptance envelope a satisfied policy returns as the run value. */
export interface StrictEnvelope<R = unknown> {
  result: R;
  completion: 'complete' | 'partial';
  childStatusCounts: Record<string, number>;
  degradedReasons: string[];
}

export interface StrictFailure {
  childStatusCounts: Record<string, number>;
  degradedReasons: string[];
}

/**
 * Reads the typed acceptance rejection out of a failed run outcome
 * (`outcome.error`); undefined for every other error, so ordinary error
 * handling stays untouched. The CLI equivalent is `rulvar run --strict`,
 * which turns a partial completion into a nonzero exit without any
 * parsing.
 */
export function explainStrictFailure(error: WireError | undefined): StrictFailure | undefined {
  if (error?.code !== 'fail_run') {
    return undefined;
  }
  const data = error.data as
    | {
        source?: string;
        childStatusCounts?: Record<string, number>;
        degradedReasons?: string[];
      }
    | undefined;
  if (data?.source !== 'orchestrator_acceptance') {
    return undefined;
  }
  return {
    childStatusCounts: data.childStatusCounts ?? {},
    degradedReasons: data.degradedReasons ?? [],
  };
}
