/**
 * SqliteQuotaLimiter (RV-215): the cross-process reference limiter
 * mirrors memoryQuotaLimiter's semantics over one database file, so
 * two limiter INSTANCES (two engine processes in production)
 * coordinate one global quota, and reconciliation works from either
 * side. The engine-level e2e drives two REAL engines over one file.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  InMemoryStore,
  QUOTA_WINDOW_MS,
  createEngine,
  defineWorkflow,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type QuotaReservationRequest,
  type QuotaRule,
} from '@rulvar/core';
import { quotaRulesConformance, registerConformance } from '@rulvar/store-conformance';

import { SqliteQuotaLimiter } from './quota.js';

const freshPath = (): string => join(mkdtempSync(join(tmpdir(), 'rulvar-quota-')), 'quota.db');

// The shared construction contract (RV704): duplicated rules are
// refused before the database opens, byte for byte like every other
// reference limiter, because index-keyed memory buckets and this
// store's key-keyed buckets admit the SAME duplicated set differently.
registerConformance(
  quotaRulesConformance((rules) => new SqliteQuotaLimiter({ path: freshPath(), rules })),
  { describe, it },
);

const request = (over: Partial<QuotaReservationRequest> = {}): QuotaReservationRequest => ({
  provider: 'fake',
  model: 'fake-model',
  estimate: { requests: 1, inputTokens: 10 },
  ...over,
});

describe('SqliteQuotaLimiter semantics', () => {
  it('validates its options before the database opens', () => {
    expect(() => new SqliteQuotaLimiter({ path: '', rules: [{ requestsPerMinute: 1 }] })).toThrow(
      ConfigError,
    );
    expect(() => new SqliteQuotaLimiter({ path: freshPath(), rules: [] })).toThrow(
      /at least one rule/,
    );
  });

  it('refuses a duplicated rule under its own construction site (RV704)', () => {
    // The divergence this closes: cap 4 duplicated granted 4 on memory
    // (index-keyed buckets) and 2 here (the shared rule_key bucket is
    // debited once per matching copy on every admission).
    const rule: QuotaRule = { provider: 'fake', requestsPerMinute: 4 };
    expect(() => new SqliteQuotaLimiter({ path: freshPath(), rules: [rule, { ...rule }] })).toThrow(
      /SqliteQuotaLimiterOptions\.rules\[1\] duplicates SqliteQuotaLimiterOptions\.rules\[0\]/,
    );
  });

  it('admits, denies with the window remainder, and reconciles like the memory reference', async () => {
    let at = QUOTA_WINDOW_MS * 100 + 15_000;
    const limiter = new SqliteQuotaLimiter({
      path: freshPath(),
      rules: [
        { provider: 'fake', requestsPerMinute: 2 },
        { provider: 'fake', tokensPerMinute: 100 },
      ],
      now: () => at,
    });
    const first = await limiter.reserve(
      request({ estimate: { requests: 1, inputTokens: 40, maxOutputTokens: 40 } }),
    );
    expect(first.granted).toBe(true);
    // 80 of 100 tokens estimated: an 80-token estimate cannot fit.
    const blocked = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 80 } }));
    expect(blocked).toEqual({
      granted: false,
      retryAfterMs: 45_000,
      reason: 'tokensPerMinute 100 exhausted',
    });
    // The first attempt settles at 15 actual tokens; now it fits, and
    // the request cap (2) becomes the binding rule for the third call.
    await limiter.reconcile((first as { reservationId: string }).reservationId, {
      inputTokens: 10,
      outputTokens: 5,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(limiter.snapshot()[1]?.tokens).toBe(15);
    expect(
      (await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 80 } }))).granted,
    ).toBe(true);
    const third = await limiter.reserve(request());
    expect(third).toEqual({
      granted: false,
      retryAfterMs: 45_000,
      reason: 'requestsPerMinute 2 exhausted',
    });
    // The next window admits again.
    at += QUOTA_WINDOW_MS;
    expect((await limiter.reserve(request())).granted).toBe(true);
    limiter.close();
  });

  it('two instances over one file enforce one cap, and reconcile crosses instances', async () => {
    const path = freshPath();
    const at = QUOTA_WINDOW_MS * 9;
    const rules = [{ provider: 'fake', requestsPerMinute: 3, tokensPerMinute: 1_000 }];
    const a = new SqliteQuotaLimiter({ path, rules, now: () => at });
    const b = new SqliteQuotaLimiter({ path, rules, now: () => at });
    const first = await a.reserve(request({ estimate: { requests: 1, inputTokens: 600 } }));
    expect(first.granted).toBe(true);
    expect((await b.reserve(request())).granted).toBe(true);
    expect((await a.reserve(request())).granted).toBe(true);
    // The shared request cap of 3 is exhausted for BOTH instances.
    expect((await b.reserve(request())).granted).toBe(false);
    expect((await a.reserve(request())).granted).toBe(false);
    // Instance B reconciles the reservation instance A granted.
    await b.reconcile((first as { reservationId: string }).reservationId, {
      inputTokens: 5,
      outputTokens: 5,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(a.snapshot()[0]?.tokens).toBe(30);
    expect(b.snapshot()[0]?.requests).toBe(3);
    a.close();
    b.close();
  });
});

const caps: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high'],
  contextWindow: 200_000,
  maxOutputTokens: 4_096,
};

function answeringAdapter(): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id: 'fake',
    calls,
    caps: () => caps,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      calls.push(req);
      yield { type: 'text-delta', text: 'answered' };
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: { inputTokens: 12, outputTokens: 7, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    },
  };
}

describe('two engines over one database file (the RV-215 acceptance, in-process form)', () => {
  it('the second engine is denied by the quota the first consumed', async () => {
    const path = freshPath();
    const rules = [{ provider: 'fake', requestsPerMinute: 1 }];
    // Frozen 1 ms before the window end: the denial's honest
    // window-remainder retryAfterMs is 1 ms, so the bounded retry
    // exhausts promptly instead of waiting out a real minute.
    const now = (): number => QUOTA_WINDOW_MS * 5 - 1;
    const wf = defineWorkflow({ name: 'ask' }, (ctx) => ctx.agent('go', { result: 'full' }));
    const engineFor = (adapter: ProviderAdapter, limiter: SqliteQuotaLimiter) =>
      createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        defaults: {
          routing: { loop: 'fake:model' },
          retry: { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 1 } },
        },
        quota: { limiter },
      });

    const adapterA = answeringAdapter();
    const limiterA = new SqliteQuotaLimiter({ path, rules, now });
    const first = await engineFor(adapterA, limiterA).run(wf, undefined).result;
    expect(first.status).toBe('ok');
    expect(adapterA.calls.length).toBe(1);

    const adapterB = answeringAdapter();
    const limiterB = new SqliteQuotaLimiter({ path, rules, now });
    const second = await engineFor(adapterB, limiterB).run(wf, undefined).result;
    expect(second.status).toBe('ok');
    const result = (second as { value: { status: string; error?: { kind: string } } }).value;
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('rate-limit');
    expect(adapterB.calls.length).toBe(0);
    expect(limiterB.snapshot()[0]?.requests).toBe(1);
    limiterA.close();
    limiterB.close();
  });
});

describe('immutable rules snapshot and canonical denial order (RV608)', () => {
  it('caller mutation of the array and the rule objects changes no decision', async () => {
    const rules: QuotaRule[] = [{ provider: 'fake', requestsPerMinute: 1 }];
    const at = QUOTA_WINDOW_MS * 21;
    const limiter = new SqliteQuotaLimiter({ path: freshPath(), rules, now: () => at });
    rules[0].requestsPerMinute = 100;
    expect((await limiter.reserve(request())).granted).toBe(true);
    rules.push({ provider: 'fake', tokensPerMinute: 1 });
    const second = await limiter.reserve(request());
    expect(second).toEqual({
      granted: false,
      retryAfterMs: QUOTA_WINDOW_MS,
      reason: 'requestsPerMinute 1 exhausted',
    });
    expect(limiter.snapshot()).toHaveLength(1);
    expect(limiter.snapshot()[0]?.rule).toEqual({ provider: 'fake', requestsPerMinute: 1 });
    limiter.close();
  });

  it('permuted identical rule sets yield the byte-identical denial object', async () => {
    const at = QUOTA_WINDOW_MS * 23 + 30_000;
    const ruleA: QuotaRule = { provider: 'fake', requestsPerMinute: 1 };
    const ruleB: QuotaRule = { provider: 'fake', tokensPerMinute: 5 };
    const denialOver = async (rules: QuotaRule[]): Promise<unknown> => {
      const limiter = new SqliteQuotaLimiter({ path: freshPath(), rules, now: () => at });
      const first = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 2 } }));
      expect(first.granted).toBe(true);
      const denial = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 10 } }));
      limiter.close();
      return denial;
    };
    const one = await denialOver([ruleA, ruleB]);
    const two = await denialOver([ruleB, ruleA]);
    expect(one).toEqual({
      granted: false,
      retryAfterMs: 30_000,
      reason: 'requestsPerMinute 1 exhausted',
    });
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });
});
