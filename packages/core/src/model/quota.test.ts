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
  quotaRuleKey,
  snapshotQuotaRules,
  validateEngineQuotaConfig,
  validateQuotaRules,
  type QuotaRule,
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

describe('immutable rules snapshot and canonical denial order (RV608)', () => {
  it('snapshotQuotaRules validates, copies only the known fields, and freezes both layers', () => {
    const original = [
      { provider: 'fake', requestsPerMinute: 2, extra: 'dropped' } as QuotaRule,
      { tokensPerMinute: 9 },
    ];
    const snapshot = snapshotQuotaRules(original, 'test rules');
    expect(snapshot).not.toBe(original);
    expect(snapshot[0]).not.toBe(original[0]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(snapshot[0]).toEqual({ provider: 'fake', requestsPerMinute: 2 });
    expect('extra' in (snapshot[0] as object)).toBe(false);
    // The caller's own graph stays untouched and unfrozen.
    expect(Object.isFrozen(original)).toBe(false);
    expect(Object.isFrozen(original[0])).toBe(false);
    expect(() => snapshotQuotaRules([], 'test rules')).toThrow(/at least one rule/);
  });

  it('quotaRuleKey is the canonical fixed-order content key', () => {
    expect(quotaRuleKey({ requestsPerMinute: 1 })).toBe(
      '{"provider":null,"model":null,"tenant":null,"requestsPerMinute":1,"tokensPerMinute":null}',
    );
    expect(quotaRuleKey({ tokensPerMinute: 5, provider: 'fake' })).toBe(
      quotaRuleKey({ provider: 'fake', tokensPerMinute: 5 }),
    );
  });

  it('caller mutation of the array and the rule objects changes no decision', async () => {
    const rules: QuotaRule[] = [{ provider: 'fake', requestsPerMinute: 1 }];
    const at = QUOTA_WINDOW_MS * 7;
    const limiter = memoryQuotaLimiter(rules, { now: () => at });
    // Ordinary JavaScript on the caller's graph, BEFORE the first
    // admission and after one: neither the raised cap nor the appended
    // broader rule may reach a decision.
    rules[0].requestsPerMinute = 100;
    expect((await limiter.reserve(request())).granted).toBe(true);
    rules.push({ provider: 'fake', tokensPerMinute: 1 });
    const second = await limiter.reserve(request());
    expect(second).toEqual({
      granted: false,
      retryAfterMs: QUOTA_WINDOW_MS,
      reason: 'requestsPerMinute 1 exhausted',
    });
    // The snapshot also pins what telemetry reports.
    expect(limiter.snapshot()).toHaveLength(1);
    expect(limiter.snapshot()[0]?.rule).toEqual({ provider: 'fake', requestsPerMinute: 1 });
  });

  it('permuted identical rule sets yield the byte-identical denial object', async () => {
    const at = QUOTA_WINDOW_MS * 3 + 30_000;
    const ruleA: QuotaRule = { provider: 'fake', requestsPerMinute: 1 };
    const ruleB: QuotaRule = { provider: 'fake', tokensPerMinute: 5 };
    const denialOver = async (rules: QuotaRule[]): Promise<unknown> => {
      const limiter = memoryQuotaLimiter(rules, { now: () => at });
      const first = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 2 } }));
      expect(first.granted).toBe(true);
      return limiter.reserve(request({ estimate: { requests: 1, inputTokens: 10 } }));
    };
    const one = await denialOver([ruleA, ruleB]);
    const two = await denialOver([ruleB, ruleA]);
    // Both rules deny (the request cap is exhausted, the token estimate
    // can never fit); the fold must pick the same rule in both orders.
    expect(one).toEqual({
      granted: false,
      retryAfterMs: 30_000,
      reason: 'requestsPerMinute 1 exhausted',
    });
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });
});

describe('the fixed-window boundary is a named compromise (RV708)', () => {
  it('a sliding minute across a boundary admits up to two caps, each fixed window enforcing its own', async () => {
    // INTENDED, not a defect: windows are fixed and epoch-aligned so
    // every reference limiter in every process computes the same window
    // from the same clock with no shared sliding state, which is the
    // cross-process parity the limiter exists for; provider-side minute
    // windows are themselves fuzzy. The price is bounded and named
    // here: a burst placed astride a boundary can consume at most TWO
    // caps inside one sliding 60 s, and each fixed window still
    // enforces its own cap exactly.
    let at = QUOTA_WINDOW_MS * 8 - 1_000;
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 2 }], {
      now: () => at,
    });
    expect((await limiter.reserve(request())).granted).toBe(true);
    expect((await limiter.reserve(request())).granted).toBe(true);
    // The old window's cap holds to its last millisecond.
    expect((await limiter.reserve(request())).granted).toBe(false);
    at = QUOTA_WINDOW_MS * 8 + 1_000;
    expect((await limiter.reserve(request())).granted).toBe(true);
    expect((await limiter.reserve(request())).granted).toBe(true);
    // Four grants inside the sliding minute [end of 7, start of 8],
    // and the new window's cap holds too: the burst is bounded at two
    // caps, never unbounded.
    expect((await limiter.reserve(request())).granted).toBe(false);
  });
});

describe('duplicate rules are refused at construction (RV704)', () => {
  const dup: QuotaRule = { provider: 'fake', model: 'fake:model', requestsPerMinute: 4 };

  it('snapshotQuotaRules names both indexes, the canonical key, and the remedy, exactly', () => {
    // The parity defect the refusal closes: index-keyed memory buckets
    // count each copy independently (the full cap admits), key-keyed
    // store buckets are debited once per matching copy (half the cap
    // admits). Nothing refused the configuration that split them.
    let thrown: unknown;
    try {
      snapshotQuotaRules(
        [dup, { provider: 'fake', tokensPerMinute: 1000 }, { ...dup }],
        'test rules',
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ConfigError);
    expect((thrown as Error).message).toBe(
      `test rules[2] duplicates test rules[0] (rule key ${quotaRuleKey(dup)}): identical rules ` +
        'occupy independent buckets in memory but share one key-debited bucket on keyed ' +
        'storage, so one configuration would admit differently per store; delete the duplicate',
    );
  });

  it('the duplicate is detected by canonical content, not by object identity or field order', () => {
    // A permuted literal and an extra unknown field still produce the
    // same canonical key, so they are the same rule.
    const permuted = { requestsPerMinute: 4, model: 'fake:model', provider: 'fake', extra: 1 };
    expect(() => snapshotQuotaRules([dup, permuted as QuotaRule], 'test rules')).toThrow(
      /test rules\[1\] duplicates test rules\[0\]/,
    );
  });

  it('memoryQuotaLimiter refuses the divergence reproduction at construction', () => {
    // The cap-4 reproduction: this exact set granted 4 on memory and 2
    // on sqlite before any admission could be compared. It is now a
    // construction error at the shared snapshot chokepoint.
    expect(() => memoryQuotaLimiter([dup, { ...dup }])).toThrow(
      /memoryQuotaLimiter rules\[1\] duplicates memoryQuotaLimiter rules\[0\]/,
    );
  });

  it('near-duplicates differing in any dimension or cap still construct', () => {
    expect(() =>
      memoryQuotaLimiter([
        dup,
        { ...dup, model: 'fake:other' },
        { ...dup, requestsPerMinute: 5 },
        { provider: 'fake', model: 'fake:model', tokensPerMinute: 1000 },
      ]),
    ).not.toThrow();
  });
});
