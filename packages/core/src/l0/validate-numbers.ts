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

function refuse(site: string, requirement: string, value: number): never {
  throw new ConfigError(`${site} must be ${requirement}; got ${String(value)}`);
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
