import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLongTimeout } from './long-timer.js';
import { MAX_TIMER_DELAY_MS } from './validate-numbers.js';

describe('setLongTimeout (v1.34.0 review P2-2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('slices a deadline beyond the Node timer maximum instead of firing early', () => {
    let clock = 0;
    const fired: number[] = [];
    setLongTimeout(
      () => fired.push(clock),
      MAX_TIMER_DELAY_MS + 60_000,
      () => clock,
    );
    clock += MAX_TIMER_DELAY_MS;
    vi.advanceTimersByTime(MAX_TIMER_DELAY_MS);
    expect(fired).toEqual([]);
    clock += 60_000;
    vi.advanceTimersByTime(60_000);
    expect(fired).toEqual([MAX_TIMER_DELAY_MS + 60_000]);
  });

  it('re-checks the wall clock: a slice firing early re-arms instead of resolving', () => {
    // The timer fires after its full delay but the observed clock lags
    // (a suspended laptop, coarse clocks): the callback must not treat
    // the firing itself as the deadline.
    let clock = 0;
    const fired: number[] = [];
    setLongTimeout(
      () => fired.push(clock),
      10_000,
      () => clock,
    );
    clock += 4_000;
    vi.advanceTimersByTime(10_000);
    expect(fired).toEqual([]);
    clock += 6_000;
    vi.advanceTimersByTime(6_000);
    expect(fired).toEqual([10_000]);
  });

  it('fires a past deadline on the next macrotask, never synchronously', () => {
    const clock = 50_000;
    const fired: number[] = [];
    setLongTimeout(
      () => fired.push(clock),
      10_000,
      () => clock,
    );
    expect(fired).toEqual([]);
    vi.advanceTimersByTime(0);
    expect(fired).toEqual([50_000]);
  });

  it('cancel() between slices stops the chain', () => {
    let clock = 0;
    const fired: number[] = [];
    const timer = setLongTimeout(
      () => fired.push(clock),
      MAX_TIMER_DELAY_MS + 60_000,
      () => clock,
    );
    clock += MAX_TIMER_DELAY_MS;
    vi.advanceTimersByTime(MAX_TIMER_DELAY_MS);
    expect(fired).toEqual([]);
    timer.cancel();
    clock += 120_000;
    vi.advanceTimersByTime(120_000);
    expect(fired).toEqual([]);
  });

  it('cancel() before the first slice fires stops a near deadline too', () => {
    let clock = 0;
    const fired: number[] = [];
    const timer = setLongTimeout(
      () => fired.push(clock),
      5_000,
      () => clock,
    );
    timer.cancel();
    clock += 10_000;
    vi.advanceTimersByTime(10_000);
    expect(fired).toEqual([]);
  });

  it('fires exactly once', () => {
    let clock = 0;
    let count = 0;
    setLongTimeout(
      () => {
        count += 1;
      },
      1_000,
      () => clock,
    );
    clock += 1_000;
    vi.advanceTimersByTime(1_000);
    vi.advanceTimersByTime(10_000);
    expect(count).toBe(1);
  });
});
