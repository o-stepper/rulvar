/**
 * Shared numeric option validators (v1.34.0 review P2-3). Every public
 * numeric knob that shapes admission, limits, concurrency, or timers is
 * validated with these helpers at its intake boundary, so a malformed
 * value (NaN, Infinity, a negative, a fraction where an integer is
 * required) fails as a typed ConfigError before any journal entry,
 * worker, or provider dispatch. NaN needs dedicated handling because
 * every comparison with it is false: a hand-written range check in the
 * rejecting polarity (`value < min || value > max`) silently admits it.
 */
import { ConfigError } from './errors.js';

/**
 * The Node timer ceiling: setTimeout clamps any longer delay to 1 ms, so
 * a naive far-future timer fires immediately (v1.34.0 review P2-2).
 * Relative timer options are validated against this bound; absolute
 * deadlines use the sliced timer in long-timer.ts instead.
 */
export const MAX_TIMER_DELAY_MS = 2_147_483_647;

/**
 * The deadline interval ceiling (RV1204): one hundred years in
 * milliseconds. A journaled deadline is an absolute ISO date computed
 * as now + interval, and the Date range ends around the year 275760,
 * so an unbounded interval (say Number.MAX_SAFE_INTEGER) survives the
 * positive-integer check and then dies as a generic 'Invalid time
 * value' at the conversion. The ceiling is NOT a wait bound: sliced
 * timers honor deadlines far beyond the Node timer maximum, and a
 * century-long suspension journals as a perfectly valid date.
 */
export const MAX_DEADLINE_MS = 3_155_760_000_000;

function refuse(site: string, requirement: string, value: number): never {
  throw new ConfigError(`${site} must be ${requirement}; got ${String(value)}`);
}

/**
 * A suspension deadline interval: a positive integer no larger than
 * {@link MAX_DEADLINE_MS}, so now + interval always journals as a
 * valid absolute date instead of dying generic at the Date conversion
 * (RV1204). Shared by the permission chain's approvalDeadlineMs and
 * the flavor B escalation deadlineMs so both knobs refuse the same
 * shapes with the same wording.
 */
export function requireDeadlineMs(value: number, site: string): void {
  requirePositiveInteger(value, site);
  if (value > MAX_DEADLINE_MS) {
    throw new ConfigError(
      `${site} ${String(value)} exceeds the ${String(MAX_DEADLINE_MS)} ms deadline ceiling ` +
        '(one hundred years): a longer interval cannot journal as a valid absolute date',
    );
  }
}

/** An integer >= 1 (counts, caps, and depths). */
export function requirePositiveInteger(value: number, site: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    refuse(site, 'a positive integer', value);
  }
}

/** An integer >= 0 (caps where zero means "none allowed"). */
export function requireNonNegativeInteger(value: number, site: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    refuse(site, 'a nonnegative integer', value);
  }
}

/** A finite number >= 0 (USD amounts and reserves). */
export function requireNonNegativeNumber(value: number, site: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    refuse(site, 'a finite nonnegative number', value);
  }
}

/** A finite fraction in (0, 1]. */
export function requireFraction(value: number, site: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1) {
    refuse(site, 'a fraction in (0, 1]', value);
  }
}

/**
 * A relative delay handed to setTimeout as-is: an integer within the
 * Node timer maximum, mirroring validateRetryPolicy's bound.
 */
export function requireTimerDelayMs(value: number, site: string): void {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TIMER_DELAY_MS
  ) {
    refuse(site, 'an integer between 1 and 2147483647 ms (the Node timer maximum)', value);
  }
}

/**
 * A declared evidence contract (RV303, enforcement RV507): minEntries
 * and estCallsPerEntry positive integers, overheadCalls a nonnegative
 * integer, enforce one of 'warn' | 'refuse'. Shared by the profile
 * intake and the preflight spawn spec so both boundaries refuse the
 * same shapes with the same wording.
 */
export function validateEvidenceContract(value: unknown, site: string): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(
      `${site} must be { minEntries, estCallsPerEntry?, overheadCalls?, enforce? }; got ${typeof value}`,
    );
  }
  const { minEntries, estCallsPerEntry, overheadCalls, enforce } = value as {
    minEntries?: unknown;
    estCallsPerEntry?: unknown;
    overheadCalls?: unknown;
    enforce?: unknown;
  };
  requirePositiveInteger(minEntries as number, `${site}.minEntries`);
  if (estCallsPerEntry !== undefined) {
    requirePositiveInteger(estCallsPerEntry as number, `${site}.estCallsPerEntry`);
  }
  if (overheadCalls !== undefined) {
    requireNonNegativeInteger(overheadCalls as number, `${site}.overheadCalls`);
  }
  if (enforce !== undefined && enforce !== 'warn' && enforce !== 'refuse') {
    throw new ConfigError(
      `${site}.enforce must be 'warn' or 'refuse'; got ${JSON.stringify(enforce)}`,
    );
  }
}

/**
 * Walks a finished public accounting object (a cost report, an
 * invoice) and throws a typed ConfigError on the first non-finite
 * number (RV610): JSON serializes Infinity and NaN as null, so a
 * non-finite value in a published report is silent telemetry
 * corruption, never a representable answer. Individually finite
 * amounts can overflow in accumulation, which is exactly why the
 * boundary is guarded and not only the per-item validations.
 */
export function requireFiniteNumbersDeep(value: unknown, site: string): void {
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'number') {
      if (!Number.isFinite(node)) {
        throw new ConfigError(
          `cost accounting overflow at ${path}: the value is ${String(node)}; no public ` +
            'report or invoice may carry a non-finite number (JSON would serialize it as null)',
        );
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        walk(item, `${path}[${String(index)}]`);
      });
      return;
    }
    if (typeof node === 'object' && node !== null) {
      for (const [key, item] of Object.entries(node)) {
        walk(item, `${path}.${key}`);
      }
    }
  };
  walk(value, site);
}
