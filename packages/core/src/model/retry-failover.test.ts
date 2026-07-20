/**
 * RetryPolicy and failover unit tests (M4-T04/T05): classification,
 * delay computation with the Appendix A defaults, chain advancement,
 * and the degenerate fallback trigger mapping.
 */
import { describe, expect, it } from 'vitest';

import {
  failoverTriggerOf,
  fallbackTriggerOf,
  nextFailover,
  normalizeFallbacks,
} from './failover.js';
import {
  DEFAULT_RETRY_POLICY,
  retryClassOf,
  retryDelayMs,
  validateRetryPolicy,
  type RetryPolicy,
} from './retry.js';

describe('retryClassOf', () => {
  it('task-class failures never retry by construction', () => {
    expect(retryClassOf({ code: 'agent', message: 'schema', retryable: false })).toBeUndefined();
    expect(
      retryClassOf({
        code: 'agent',
        message: '400',
        retryable: false,
        data: { kind: 'rate-limit' },
      }),
    ).toBeUndefined();
  });

  it('classifies rate-limit, overloaded, and transport', () => {
    expect(retryClassOf({ code: 'rate-limit', message: '429', retryable: true })).toBe(
      'rate-limit',
    );
    expect(
      retryClassOf({
        code: 'agent',
        message: '429',
        retryable: true,
        data: { kind: 'rate-limit' },
      }),
    ).toBe('rate-limit');
    expect(
      retryClassOf({
        code: 'agent',
        message: '529',
        retryable: true,
        data: { kind: 'overloaded' },
      }),
    ).toBe('overloaded');
    expect(retryClassOf({ code: 'agent', message: '503', retryable: true })).toBe('transport');
  });
});

describe('retryDelayMs', () => {
  const noJitter = { attempts: 3, backoff: { initialMs: 500, factor: 2, maxMs: 8000 } };

  it('the default jitter source is captured natively and survives a patched Math.random', () => {
    const prior = Math.random;
    Math.random = () => {
      throw new Error('patched global reached the retry jitter');
    };
    try {
      const delay = retryDelayMs(DEFAULT_RETRY_POLICY, 0);
      expect(delay).toBeGreaterThanOrEqual(250);
      expect(delay).toBeLessThanOrEqual(500);
    } finally {
      Math.random = prior;
    }
  });

  it('grows by the factor and clamps at maxMs', () => {
    expect(retryDelayMs(noJitter, 0)).toBe(500);
    expect(retryDelayMs(noJitter, 1)).toBe(1000);
    expect(retryDelayMs(noJitter, 2)).toBe(2000);
    expect(retryDelayMs(noJitter, 10)).toBe(8000);
  });

  it('a provider retryAfterMs REPLACES the computed delay', () => {
    expect(retryDelayMs(noJitter, 0, 1234)).toBe(1234);
    expect(retryDelayMs(DEFAULT_RETRY_POLICY, 5, 42, () => 0.99)).toBe(42);
  });

  it('an invalid provider retryAfterMs is ignored as adapter noise (v1.28.0 review P2)', () => {
    // NaN, Infinity, and a negative all fall back to the policy
    // backoff instead of arming an instant or overflowing timer.
    expect(retryDelayMs(noJitter, 0, Number.NaN)).toBe(500);
    expect(retryDelayMs(noJitter, 1, Number.POSITIVE_INFINITY)).toBe(1000);
    expect(retryDelayMs(noJitter, 0, -1)).toBe(500);
  });

  it('a huge finite retryAfterMs is clamped to the Node timer maximum', () => {
    expect(retryDelayMs(noJitter, 0, 3_000_000_000)).toBe(2_147_483_647);
  });

  it('every returned delay is a finite nonnegative integer', () => {
    expect(retryDelayMs(noJitter, 0, 1234.6)).toBe(1235);
    const jittered = {
      ...noJitter,
      backoff: { initialMs: 333, factor: 2, maxMs: 8000, jitter: true },
    };
    const delay = retryDelayMs(jittered, 0, undefined, () => 0.5);
    expect(Number.isInteger(delay)).toBe(true);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('equal jitter keeps the delay within [base/2, base]', () => {
    const policy = { ...noJitter, backoff: { ...noJitter.backoff, jitter: true } };
    expect(retryDelayMs(policy, 0, undefined, () => 0)).toBe(250);
    expect(retryDelayMs(policy, 0, undefined, () => 1)).toBe(500);
  });

  it('the committed defaults match Appendix A', () => {
    expect(DEFAULT_RETRY_POLICY).toEqual({
      attempts: 3,
      backoff: { initialMs: 500, factor: 2, maxMs: 8000, jitter: true },
      retryOn: ['transport', 'rate-limit', 'overloaded'],
    });
  });
});

describe('failover chain (docs/04, 11.2)', () => {
  it('normalizes the author list; absent on means both triggers', () => {
    expect(normalizeFallbacks(['a:x', 'b:y'])).toEqual([{ model: 'a:x' }, { model: 'b:y' }]);
    expect(normalizeFallbacks(undefined)).toEqual([]);
  });

  it('maps retry classes to failover triggers; budget never appears', () => {
    expect(failoverTriggerOf('transport')).toBe('transport');
    expect(failoverTriggerOf('overloaded')).toBe('transport');
    expect(failoverTriggerOf('rate-limit')).toBe('rate-limit');
    expect(failoverTriggerOf(undefined)).toBeUndefined();
  });

  it('advances past targets whose on excludes the trigger, never backwards', () => {
    const chain = [
      { on: undefined },
      { on: ['transport'] as Array<'transport' | 'rate-limit'> },
      { on: ['rate-limit'] as Array<'transport' | 'rate-limit'> },
    ];
    expect(nextFailover(chain, 'rate-limit', 0)).toBe(2);
    expect(nextFailover(chain, 'transport', 0)).toBe(1);
    expect(nextFailover(chain, 'transport', 1)).toBeUndefined();
    expect(nextFailover(chain, 'rate-limit', 2)).toBeUndefined();
  });
});

describe('degenerate fallback trigger (docs/04, 11.3)', () => {
  it('classifies terminal outcomes per the committed rule', () => {
    expect(fallbackTriggerOf({ status: 'error', error: { kind: 'schema-mismatch' } })).toBe(
      'schema-exhausted',
    );
    expect(fallbackTriggerOf({ status: 'error', error: { kind: 'transport' } })).toBe('error');
    expect(fallbackTriggerOf({ status: 'error' })).toBe('error');
    expect(fallbackTriggerOf({ status: 'limit' })).toBe('limit');
    expect(fallbackTriggerOf({ status: 'cancelled' })).toBeUndefined();
    expect(fallbackTriggerOf({ status: 'escalated' })).toBeUndefined();
    expect(fallbackTriggerOf({ status: 'ok' })).toBeUndefined();
  });
});

describe('validateRetryPolicy (v1.29.0 review P2)', () => {
  const backoff = { initialMs: 500, factor: 2, maxMs: 8000 };

  it('accepts the Appendix A defaults and every documented legal shape', () => {
    expect(() => validateRetryPolicy(DEFAULT_RETRY_POLICY)).not.toThrow();
    expect(() =>
      validateRetryPolicy({ attempts: 1, backoff: { initialMs: 0, factor: 0.5, maxMs: 0 } }),
    ).not.toThrow();
    expect(() => validateRetryPolicy({ attempts: 2, backoff, retryOn: [] })).not.toThrow();
    expect(() =>
      validateRetryPolicy({ attempts: 2, backoff: { initialMs: 10, factor: 2, maxMs: 1 } }),
    ).not.toThrow();
    expect(() =>
      validateRetryPolicy({
        attempts: 2,
        backoff: { ...backoff, jitter: true },
        retryOn: ['rate-limit', 'overloaded'],
      }),
    ).not.toThrow();
  });

  it('rejects every invalid attempts value naming the field and source', () => {
    for (const attempts of [0, -1, 1.5, NaN, Infinity, 2 ** 53]) {
      expect(() => validateRetryPolicy({ attempts, backoff }, 'engine defaults.retry')).toThrow(
        /engine defaults\.retry: attempts must be a positive safe integer/,
      );
    }
  });

  it('rejects out of range, fractional, and non finite backoff numbers', () => {
    const bad: Array<[Partial<RetryPolicy['backoff']>, RegExp]> = [
      [{ initialMs: -1 }, /backoff\.initialMs must be an integer between 0 and 2147483647/],
      [{ initialMs: NaN }, /backoff\.initialMs/],
      [{ initialMs: 0.5 }, /backoff\.initialMs/],
      [{ initialMs: 2_147_483_648 }, /backoff\.initialMs/],
      [{ maxMs: -1 }, /backoff\.maxMs must be an integer between 0 and 2147483647/],
      [{ maxMs: Infinity }, /backoff\.maxMs/],
      [{ factor: 0 }, /backoff\.factor must be a finite number above zero/],
      [{ factor: -2 }, /backoff\.factor/],
      [{ factor: NaN }, /backoff\.factor/],
      [{ factor: Infinity }, /backoff\.factor/],
    ];
    for (const [patch, message] of bad) {
      expect(() => validateRetryPolicy({ attempts: 2, backoff: { ...backoff, ...patch } })).toThrow(
        message,
      );
    }
  });

  it('rejects a non boolean jitter and a malformed retryOn', () => {
    expect(() =>
      validateRetryPolicy({ attempts: 2, backoff: { ...backoff, jitter: 1 as never } }),
    ).toThrow(/backoff\.jitter must be a boolean when given/);
    expect(() =>
      validateRetryPolicy({ attempts: 2, backoff, retryOn: 'transport' as never }),
    ).toThrow(/retryOn must be an array of retry classes/);
    expect(() =>
      validateRetryPolicy({ attempts: 2, backoff, retryOn: ['network' as never] }),
    ).toThrow(/retryOn must contain only 'transport', 'rate-limit', or 'overloaded'/);
    expect(() =>
      validateRetryPolicy({ attempts: 2, backoff, retryOn: ['transport', 'transport'] }),
    ).toThrow(/retryOn must not repeat a retry class/);
  });

  it('rejects a missing or non object backoff and a non object policy', () => {
    expect(() => validateRetryPolicy({ attempts: 2 } as never)).toThrow(
      /backoff must be an object with initialMs, factor, and maxMs/,
    );
    expect(() => validateRetryPolicy(null as never)).toThrow(/a RetryPolicy must be an object/);
  });
});
