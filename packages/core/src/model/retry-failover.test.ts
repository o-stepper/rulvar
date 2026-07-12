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
import { DEFAULT_RETRY_POLICY, retryClassOf, retryDelayMs } from './retry.js';

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
