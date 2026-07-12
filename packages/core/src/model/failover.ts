/**
 * Failover keyed on the requested modelSpec (M4-T04): the content key
 * hashes the REQUESTED spec, so a response served by a failover model
 * replays correctly and the fallback changes only `servedBy` in the
 * journal entry. Budget is explicitly excluded as a trigger.
 *
 * The degenerate `fallback` field also lives
 * here: an AGENT-LEVEL second attempt (new content key, one journaled
 * decision entry), as opposed to the transport-level failover above
 * (same entry, servedBy only).
 *
 * Full contract: https://docs.rulvar.com/guide/model-routing (as
 * amended in M4-T04).
 */
import type { ModelRef } from '../l0/messages.js';
import type { AgentError } from '../l0/errors.js';
import type { RetryClass } from './retry.js';

/** Transport-level failover triggers; budget is explicitly excluded. */
export type FailoverTrigger = 'transport' | 'rate-limit';

/** One resolved failover target (rich form). */
export interface FailoverTarget {
  model: ModelRef;
  /** Triggers this target serves; absent = both. */
  on?: FailoverTrigger[];
}

/** Normalizes the author-facing ModelChoice.fallbacks list. */
export function normalizeFallbacks(refs: ModelRef[] | undefined): FailoverTarget[] {
  return (refs ?? []).map((model) => ({ model }));
}

/**
 * Maps a retry class to its failover trigger once retries exhaust.
 * Overloaded (529) is transport-class for failover purposes; a
 * non-retryable error never fails over.
 */
export function failoverTriggerOf(retryClass: RetryClass | undefined): FailoverTrigger | undefined {
  if (retryClass === undefined) {
    return undefined;
  }
  return retryClass === 'rate-limit' ? 'rate-limit' : 'transport';
}

/**
 * The next target index past `from` that serves `trigger`, or undefined
 * when the chain is exhausted. Index 0 is the primary; the chain never
 * moves backwards (sticky failover).
 */
export function nextFailover(
  targets: Array<Pick<FailoverTarget, 'on'>>,
  trigger: FailoverTrigger,
  from: number,
): number | undefined {
  for (let index = from + 1; index < targets.length; index += 1) {
    const on = targets[index]?.on;
    if (on === undefined || on.includes(trigger)) {
      return index;
    }
  }
  return undefined;
}

/** The degenerate fallback triggers. */
export type FallbackTrigger = 'error' | 'limit' | 'schema-exhausted';

/** The degenerate fallback field: one agent-level second attempt. */
export interface FallbackField {
  model: ModelRef;
  on: FallbackTrigger[];
}

/**
 * Classifies a terminal agent outcome for the degenerate fallback:
 * schema-mismatch errors are
 * 'schema-exhausted'; any other error is 'error'; limit terminals (the
 * no-progress abort included) are 'limit'; cancelled, escalated, and
 * skipped never trigger.
 */
export function fallbackTriggerOf(outcome: {
  status: string;
  error?: Pick<AgentError, 'kind'>;
}): FallbackTrigger | undefined {
  if (outcome.status === 'error') {
    return outcome.error?.kind === 'schema-mismatch' ? 'schema-exhausted' : 'error';
  }
  if (outcome.status === 'limit') {
    return 'limit';
  }
  return undefined;
}
