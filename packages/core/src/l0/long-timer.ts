/**
 * Sliced timers for absolute wall-clock deadlines (v1.34.0 review P2-2).
 *
 * Node clamps a setTimeout delay above 2147483647 ms (about 24.8 days)
 * to 1 ms, so a naive timer for a far-future deadline fires immediately.
 * setLongTimeout never hands Node more than one MAX_TIMER_DELAY_MS
 * slice, re-checks the wall clock when a slice fires, and re-arms until
 * the clock actually reaches the deadline: firing a slice is never taken
 * as proof the deadline arrived. A deadline already in the past fires on
 * the next macrotask (delay 0), matching the plain setTimeout behavior
 * the callers had for near deadlines.
 */
import { MAX_TIMER_DELAY_MS } from './validate-numbers.js';

export interface LongTimer {
  /** Stops the timer; the callback will not fire after this resolves. */
  cancel(): void;
}

/**
 * Schedules `onDue` for the absolute wall-clock instant `dueAtMs` as
 * reported by `now` (default Date.now), slicing delays beyond the Node
 * timer maximum.
 */
export function setLongTimeout(
  onDue: () => void,
  dueAtMs: number,
  now: () => number = Date.now,
): LongTimer {
  let handle: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  const arm = (): void => {
    const remaining = Math.max(0, dueAtMs - now());
    handle = setTimeout(
      () => {
        if (cancelled) {
          return;
        }
        if (now() >= dueAtMs) {
          onDue();
          return;
        }
        arm();
      },
      Math.min(remaining, MAX_TIMER_DELAY_MS),
    );
  };
  arm();
  return {
    cancel: () => {
      cancelled = true;
      if (handle !== undefined) {
        clearTimeout(handle);
      }
    },
  };
}
