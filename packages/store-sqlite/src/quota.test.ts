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
} from '@rulvar/core';

import { SqliteQuotaLimiter } from './quota.js';

const freshPath = (): string => join(mkdtempSync(join(tmpdir(), 'rulvar-quota-')), 'quota.db');

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
