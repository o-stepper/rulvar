/**
 * The quota rule model and the in-process reference limiter (RV-215):
 * validation fails loud at intake, admission is exact on requests and
 * estimate-then-reconcile on tokens, windows are fixed and
 * epoch-aligned, and every matching rule must admit.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { QuotaReservationRequest } from '../l0/spi/quota.js';
import {
  QUOTA_WINDOW_MS,
  memoryQuotaLimiter,
  quotaRuleAdmission,
  validateEngineQuotaConfig,
  validateQuotaRules,
} from './quota.js';

const request = (over: Partial<QuotaReservationRequest> = {}): QuotaReservationRequest => ({
  provider: 'fake',
  model: 'fake-model',
  estimate: { requests: 1, inputTokens: 10 },
  ...over,
});

describe('validateQuotaRules', () => {
  it('rejects a non-array, an empty set, and a rule without any cap', () => {
    expect(() => validateQuotaRules({} as never)).toThrow(ConfigError);
    expect(() => validateQuotaRules([])).toThrow(/at least one rule/);
    expect(() => validateQuotaRules([{ provider: 'fake' }])).toThrow(
      /must set requestsPerMinute or tokensPerMinute/,
    );
  });

  it('rejects malformed dimensions and malformed caps with the exact site', () => {
    expect(() => validateQuotaRules([{ provider: '', requestsPerMinute: 1 }])).toThrow(
      /\[0\]\.provider/,
    );
    expect(() => validateQuotaRules([{ requestsPerMinute: 0 }])).toThrow(
      /\[0\]\.requestsPerMinute must be a positive integer/,
    );
    expect(() => validateQuotaRules([{ requestsPerMinute: 1 }, { tokensPerMinute: 1.5 }])).toThrow(
      /\[1\]\.tokensPerMinute/,
    );
  });
});

describe('validateEngineQuotaConfig', () => {
  const limiter = memoryQuotaLimiter([{ requestsPerMinute: 1 }]);

  it('accepts undefined and a well-formed config', () => {
    expect(() => validateEngineQuotaConfig(undefined)).not.toThrow();
    expect(() =>
      validateEngineQuotaConfig({ limiter, tenant: 'acme', onLimiterError: 'allow' }),
    ).not.toThrow();
  });

  it('rejects a non-limiter, an empty tenant, and an unknown failure policy', () => {
    expect(() => validateEngineQuotaConfig({ limiter: 42 } as never)).toThrow(
      /limiter must implement QuotaLimiter/,
    );
    expect(() => validateEngineQuotaConfig({ limiter, tenant: '' })).toThrow(
      /tenant must be a nonempty string/,
    );
    expect(() =>
      validateEngineQuotaConfig({ limiter, onLimiterError: 'explode' as never }),
    ).toThrow(/'deny' or 'allow'/);
  });
});

describe('memoryQuotaLimiter', () => {
  it('admits up to requestsPerMinute, then denies with the window remainder', async () => {
    let at = QUOTA_WINDOW_MS * 100 + 15_000;
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 2 }], {
      now: () => at,
    });
    expect((await limiter.reserve(request())).granted).toBe(true);
    expect((await limiter.reserve(request())).granted).toBe(true);
    const denied = await limiter.reserve(request());
    expect(denied).toEqual({
      granted: false,
      retryAfterMs: 45_000,
      reason: 'requestsPerMinute 2 exhausted',
    });
    // The next window admits again.
    at += 45_000;
    expect((await limiter.reserve(request())).granted).toBe(true);
  });

  it('reconciles token estimates down so later calls fit, and up past the cap', async () => {
    const at = QUOTA_WINDOW_MS * 7;
    const limiter = memoryQuotaLimiter([{ tokensPerMinute: 100 }], { now: () => at });
    const first = await limiter.reserve(
      request({ estimate: { requests: 1, inputTokens: 40, maxOutputTokens: 40 } }),
    );
    expect(first.granted).toBe(true);
    // 80 of 100 estimated: a second 80-token estimate does not fit...
    const blocked = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 80 } }));
    expect(blocked.granted).toBe(false);
    // ...until the first attempt settles at its actual 15 tokens.
    await limiter.reconcile((first as { reservationId: string }).reservationId, {
      inputTokens: 10,
      outputTokens: 5,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(limiter.snapshot()[0]?.tokens).toBe(15);
    expect(
      (await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 80 } }))).granted,
    ).toBe(true);
  });

  it('denies an estimate that can never fit with retryAfterMs 0', async () => {
    const limiter = memoryQuotaLimiter([{ tokensPerMinute: 50 }], { now: () => 0 });
    const denied = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 60 } }));
    expect(denied).toEqual({
      granted: false,
      retryAfterMs: 0,
      reason: 'the estimate of 60 tokens can never fit tokensPerMinute 50',
    });
  });

  it('scopes rules by dimension and consumes every matching rule', async () => {
    const at = QUOTA_WINDOW_MS * 3;
    const limiter = memoryQuotaLimiter(
      [
        { provider: 'fake', requestsPerMinute: 10 },
        { provider: 'fake', model: 'fake-model', requestsPerMinute: 1 },
        { provider: 'other', requestsPerMinute: 1 },
      ],
      { now: () => at },
    );
    expect((await limiter.reserve(request())).granted).toBe(true);
    // The per-model rule is exhausted even though the provider-wide
    // rule still has room; every matching rule must admit.
    expect((await limiter.reserve(request())).granted).toBe(false);
    // A different model of the same provider only consults the
    // provider-wide rule.
    expect((await limiter.reserve(request({ model: 'fake-mini' }))).granted).toBe(true);
    const [wide, perModel, other] = limiter.snapshot();
    expect(wide?.requests).toBe(2);
    expect(perModel?.requests).toBe(1);
    expect(other?.requests).toBe(0);
  });

  it('tenant rules only govern the matching tenant', async () => {
    const limiter = memoryQuotaLimiter([{ tenant: 'acme', requestsPerMinute: 1 }], {
      now: () => 0,
    });
    expect((await limiter.reserve(request({ tenant: 'acme' }))).granted).toBe(true);
    expect((await limiter.reserve(request({ tenant: 'acme' }))).granted).toBe(false);
    // An untenanted request and a different tenant pass free.
    expect((await limiter.reserve(request())).granted).toBe(true);
    expect((await limiter.reserve(request({ tenant: 'globex' }))).granted).toBe(true);
  });

  it('reconcile is idempotent, tolerates unknown ids, and ages out across windows', async () => {
    let at = 0;
    const limiter = memoryQuotaLimiter([{ tokensPerMinute: 100 }], { now: () => at });
    const usage = { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 };
    await expect(limiter.reconcile('never-issued', usage)).resolves.toBeUndefined();
    const granted = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 50 } }));
    const id = (granted as { reservationId: string }).reservationId;
    at += QUOTA_WINDOW_MS;
    // The window rolled: the estimate aged out, reconcile is a no-op.
    await limiter.reconcile(id, usage);
    expect(limiter.snapshot()[0]?.tokens).toBe(0);
    // A second reconcile of the same id is a no-op too.
    await expect(limiter.reconcile(id, usage)).resolves.toBeUndefined();
  });

  it('a request matching no rule is granted without consuming anything', async () => {
    const limiter = memoryQuotaLimiter([{ provider: 'other', requestsPerMinute: 1 }], {
      now: () => 0,
    });
    expect((await limiter.reserve(request())).granted).toBe(true);
    expect((await limiter.reserve(request())).granted).toBe(true);
    expect(limiter.snapshot()[0]?.requests).toBe(0);
  });
});

describe('quotaRuleAdmission', () => {
  it('counts multi-request estimates against the hard cap', () => {
    const verdict = quotaRuleAdmission(
      { requestsPerMinute: 3 },
      { requests: 2, tokens: 0 },
      { requests: 2, tokens: 0 },
      1_000,
    );
    expect(verdict).toEqual({
      admit: false,
      retryAfterMs: 1_000,
      reason: 'requestsPerMinute 3 exhausted',
    });
  });
});
