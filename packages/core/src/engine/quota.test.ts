/**
 * The shared quota limiter at the engine surface (RV-215): every live
 * wire dispatch reserves first, a denial rides the provider-429 retry
 * and failover machinery without paying a wire call, reservations
 * reconcile to actual usage, and two engines sharing one limiter
 * enforce ONE global quota. Reproduced on published 1.55.0 before the
 * fix: no SPI, `quota` a silently dropped word, and two engines
 * exceeding an intended global cap with nothing to deny them.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ChatEvent, ChatRequest, Usage } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { QuotaDecision, QuotaLimiter, QuotaReservationRequest } from '../l0/spi/quota.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { QUOTA_WINDOW_MS, memoryQuotaLimiter } from '../model/quota.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const fastRetry = { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 1 } };

function answeringAdapter(id = 'fake'): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id,
    calls,
    caps: () => testCaps(),
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

function engineWith(adapter: ProviderAdapter, quota?: Parameters<typeof createEngine>[0]['quota']) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: new InMemoryStore({ quiet: true }) },
    defaults: { routing: { loop: 'fake:model' }, retry: fastRetry },
    ...(quota === undefined ? {} : { quota }),
  });
}

const askWf = defineWorkflow({ name: 'ask' }, (ctx) => ctx.agent('go', { result: 'full' }));

describe('createEngine quota intake', () => {
  it('a malformed quota config is a typed ConfigError before any run', () => {
    expect(() => engineWith(answeringAdapter(), { limiter: 42 } as never)).toThrow(ConfigError);
    expect(() =>
      engineWith(answeringAdapter(), {
        limiter: memoryQuotaLimiter([{ requestsPerMinute: 1 }]),
        onLimiterError: 'explode' as never,
      }),
    ).toThrow(ConfigError);
  });
});

describe('the global quota gate across engines (the RV-215 acceptance)', () => {
  it('two engines sharing one limiter enforce one cap: the second run pays nothing and fails typed', async () => {
    // The clock is frozen 1 ms before the window end, so the denial's
    // honest window-remainder retryAfterMs is 1 ms and the bounded
    // retry exhausts promptly instead of waiting out a real minute.
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 1 }], {
      now: () => QUOTA_WINDOW_MS * 5 - 1,
    });
    const adapterA = answeringAdapter();
    const adapterB = answeringAdapter();
    const first = await engineWith(adapterA, { limiter }).run(askWf, undefined).result;
    expect(first.status).toBe('ok');
    expect(adapterA.calls.length).toBe(1);

    const second = await engineWith(adapterB, { limiter }).run(askWf, undefined).result;
    expect(second.status).toBe('ok');
    const result = (second as { value: { status: string; error?: { kind: string } } }).value;
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('rate-limit');
    // THE gate: the denied engine dispatched NOTHING; the global cap
    // of one request held across both engines.
    expect(adapterB.calls.length).toBe(0);
    expect(limiter.snapshot()[0]?.requests).toBe(1);
  });
});

describe('denial, retry, and failover composition', () => {
  it('a denied-then-granted reservation retries without paying a wire call for the denial', async () => {
    const seen: QuotaReservationRequest[] = [];
    let denials = 1;
    const limiter: QuotaLimiter = {
      reserve: (request) => {
        seen.push(request);
        if (denials > 0) {
          denials -= 1;
          return Promise.resolve({ granted: false, retryAfterMs: 1, reason: 'window full' });
        }
        return Promise.resolve({ granted: true, reservationId: `r${String(seen.length)}` });
      },
      reconcile: () => Promise.resolve(),
    };
    const adapter = answeringAdapter();
    const outcome = await engineWith(adapter, { limiter }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    expect((outcome as { value: { status: string } }).value.status).toBe('ok');
    // Two reservations (the denial, then the grant) for ONE wire call.
    expect(seen.length).toBe(2);
    expect(adapter.calls.length).toBe(1);
  });

  it('reconcile receives the granted reservation id and the attempt actual usage', async () => {
    const reconciled: Array<{ id: string; usage: Usage }> = [];
    const limiter: QuotaLimiter = {
      reserve: () => Promise.resolve({ granted: true, reservationId: 'the-reservation' }),
      reconcile: (id, usage) => {
        reconciled.push({ id, usage });
        return Promise.resolve();
      },
    };
    const adapter = answeringAdapter();
    const outcome = await engineWith(adapter, { limiter }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(reconciled).toEqual([
      {
        id: 'the-reservation',
        usage: { inputTokens: 12, outputTokens: 7, cacheReadTokens: 0, cacheWriteTokens: 0 },
      },
    ]);
  });

  it('the reservation carries provider, model, the estimate, the tenant, and the runId', async () => {
    const seen: QuotaReservationRequest[] = [];
    const limiter: QuotaLimiter = {
      reserve: (request) => {
        seen.push(request);
        return Promise.resolve({ granted: true, reservationId: 'r1' });
      },
      reconcile: () => Promise.resolve(),
    };
    const handle = engineWith(answeringAdapter(), { limiter, tenant: 'acme' }).run(
      askWf,
      undefined,
    );
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(seen.length).toBe(1);
    const request = seen[0];
    expect(request.provider).toBe('fake');
    expect(request.model).toBe('model');
    expect(request.tenant).toBe('acme');
    expect(request.runId).toBe(handle.runId);
    expect(request.estimate.requests).toBe(1);
    expect(request.estimate.inputTokens).toBeGreaterThan(0);
  });

  it('a permanently denied primary fails over to a fallback that reserves under its own model', async () => {
    // The primary's estimate can never fit its token cap: retryAfterMs
    // 0 exhausts the bounded attempts without waiting, then the chain
    // advances and the fallback reserves under ITS dimensions.
    const limiter = memoryQuotaLimiter([{ provider: 'primary', tokensPerMinute: 1 }]);
    const primary = answeringAdapter('primary');
    const backup = answeringAdapter('backup');
    const engine = createEngine({
      adapters: [primary, backup],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: {
        routing: { loop: { model: 'primary:model', fallbacks: ['backup:model-b'] } },
        retry: fastRetry,
      },
      quota: { limiter },
    });
    const outcome = await engine.run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    const result = (outcome as { value: { status: string; servedBy?: string } }).value;
    expect(result.status).toBe('ok');
    expect(result.servedBy).toBe('backup:model-b');
    expect(primary.calls.length).toBe(0);
    expect(backup.calls.length).toBe(1);
  });
});

describe('limiter infrastructure failure policy', () => {
  const throwingLimiter: QuotaLimiter = {
    reserve: () => Promise.reject(new Error('redis is down')),
    reconcile: () => Promise.resolve(),
  };

  it("the default 'deny' fails closed: no dispatch, a typed transport-class terminal", async () => {
    const adapter = answeringAdapter();
    const outcome = await engineWith(adapter, { limiter: throwingLimiter }).run(askWf, undefined)
      .result;
    expect(outcome.status).toBe('ok');
    const result = (outcome as { value: { status: string; error?: { kind: string } } }).value;
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('transport');
    expect(adapter.calls.length).toBe(0);
  });

  it("'allow' fails open: a warning is logged and the call dispatches without a reservation", async () => {
    const adapter = answeringAdapter();
    const handle = engineWith(adapter, {
      limiter: throwingLimiter,
      onLimiterError: 'allow',
    }).run(askWf, undefined);
    const warnings: string[] = [];
    void (async () => {
      for await (const event of handle.events) {
        if (event.type === 'log' && event.level === 'warn') {
          warnings.push(event.msg);
        }
      }
    })();
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect((outcome as { value: { status: string } }).value.status).toBe('ok');
    expect(adapter.calls.length).toBe(1);
    expect(warnings.some((msg) => msg.includes("onLimiterError 'allow'"))).toBe(true);
    expect(warnings.some((msg) => msg.includes('redis is down'))).toBe(true);
  });
});

describe('byte-identity when granted', () => {
  it('an always-granting limiter changes nothing the provider sees', async () => {
    const bare = answeringAdapter();
    const quotaed = answeringAdapter();
    const without = await engineWith(bare).run(askWf, undefined).result;
    const withQuota = await engineWith(quotaed, {
      limiter: memoryQuotaLimiter([{ requestsPerMinute: 100 }]),
    }).run(askWf, undefined).result;
    expect(without.status).toBe('ok');
    expect(withQuota.status).toBe('ok');
    expect(JSON.stringify(quotaed.calls)).toBe(JSON.stringify(bare.calls));
  });
});

describe('quota drift telemetry (the v1.71 experiment review, P0.5 resized)', () => {
  const DECLARED = [{ requestsPerMinute: 120, tokensPerMinute: 12_000_000 }];

  /** Fails the first wire call with a 429 carrying reported limits, then answers. */
  function limitedThenAnswering(
    reportedLimits: Record<string, number>,
  ): ProviderAdapter & { callCount: () => number } {
    let calls = 0;
    return {
      id: 'fake',
      callCount: () => calls,
      caps: () => testCaps(),
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        void req;
        calls += 1;
        if (calls === 1) {
          yield {
            type: 'error',
            error: {
              code: 'agent',
              message: 'rate limited',
              retryable: true,
              data: { kind: 'rate-limit', retryAfterMs: 1, status: 429, reportedLimits },
            },
          };
          return;
        }
        yield { type: 'text-delta', text: 'answered' };
        yield {
          type: 'finish',
          finish: { reason: 'stop' },
          usage: { inputTokens: 12, outputTokens: 7, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      },
    };
  }

  it('journals declared-versus-reported per dimension and warns, once per invocation', async () => {
    const adapter = limitedThenAnswering({ requestsPerMinute: 20, tokensPerMinute: 1_000_000 });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' }, retry: fastRetry },
      quota: {
        limiter: memoryQuotaLimiter(DECLARED),
        tenant: 'acme',
        declaredRules: DECLARED,
      },
    });
    const handle = engine.run(askWf, undefined, { runId: 'DRIFT' });
    const warns: string[] = [];
    const drained = (async () => {
      for await (const event of handle.events) {
        if (event.type === 'log' && event.level === 'warn') {
          warns.push(event.msg);
        }
      }
    })();
    const outcome = await handle.result;
    await drained;
    expect(outcome.status).toBe('ok');
    const drifts = (await store.load('DRIFT'))
      .filter(
        (e) =>
          e.kind === 'decision' &&
          (e.value as { decisionType?: string } | undefined)?.decisionType === 'quota_drift',
      )
      .map((e) => e.value as Record<string, unknown>);
    expect(drifts).toHaveLength(2);
    expect(drifts).toContainEqual(
      expect.objectContaining({
        dimension: 'requests',
        provider: 'fake',
        model: 'model',
        tenant: 'acme',
        declaredPerMinute: 120,
        reportedPerMinute: 20,
      }),
    );
    expect(drifts).toContainEqual(
      expect.objectContaining({
        dimension: 'tokens',
        declaredPerMinute: 12_000_000,
        reportedPerMinute: 1_000_000,
      }),
    );
    expect(warns.join('\n')).toContain("journaled decision 'quota_drift'");
    expect(warns.join('\n')).toContain('declared 120/min');
  });

  it('sums split input and output token limits before comparing (the anthropic shape)', async () => {
    const adapter = limitedThenAnswering({
      inputTokensPerMinute: 400_000,
      outputTokensPerMinute: 80_000,
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' }, retry: fastRetry },
      quota: { limiter: memoryQuotaLimiter(DECLARED), declaredRules: DECLARED },
    });
    const outcome = await engine.run(askWf, undefined, { runId: 'DRIFT-SUM' }).result;
    expect(outcome.status).toBe('ok');
    const drifts = (await store.load('DRIFT-SUM'))
      .filter(
        (e) =>
          e.kind === 'decision' &&
          (e.value as { decisionType?: string } | undefined)?.decisionType === 'quota_drift',
      )
      .map((e) => e.value as Record<string, unknown>);
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      dimension: 'tokens',
      declaredPerMinute: 12_000_000,
      reportedPerMinute: 480_000,
    });
  });

  it('stays silent without declaredRules and when the declaration is honest', async () => {
    // (a) No declaredRules: the observation flows through retry exactly
    // as before, zero new journal entries (byte identity).
    const bare = limitedThenAnswering({ requestsPerMinute: 20 });
    const bareStore = new InMemoryStore();
    const bareOutcome = await createEngine({
      adapters: [bare],
      stores: { journal: bareStore },
      defaults: { routing: { loop: 'fake:model' }, retry: fastRetry },
      quota: { limiter: memoryQuotaLimiter(DECLARED) },
    }).run(askWf, undefined, { runId: 'NO-DECL' }).result;
    expect(bareOutcome.status).toBe('ok');
    expect(
      (await bareStore.load('NO-DECL')).some(
        (e) => (e.value as { decisionType?: string } | undefined)?.decisionType === 'quota_drift',
      ),
    ).toBe(false);

    // (b) Honest declaration: reported meets or exceeds it, no drift.
    const honest = limitedThenAnswering({ requestsPerMinute: 200, tokensPerMinute: 20_000_000 });
    const honestStore = new InMemoryStore();
    const honestOutcome = await createEngine({
      adapters: [honest],
      stores: { journal: honestStore },
      defaults: { routing: { loop: 'fake:model' }, retry: fastRetry },
      quota: { limiter: memoryQuotaLimiter(DECLARED), declaredRules: DECLARED },
    }).run(askWf, undefined, { runId: 'HONEST' }).result;
    expect(honestOutcome.status).toBe('ok');
    expect(
      (await honestStore.load('HONEST')).some(
        (e) => (e.value as { decisionType?: string } | undefined)?.decisionType === 'quota_drift',
      ),
    ).toBe(false);
  });

  it('rejects malformed declaredRules at createEngine intake', () => {
    expect(() =>
      createEngine({
        adapters: [answeringAdapter()],
        stores: { journal: new InMemoryStore() },
        defaults: { routing: { loop: 'fake:model' } },
        quota: {
          limiter: memoryQuotaLimiter(DECLARED),
          declaredRules: [{ requestsPerMinute: -1 }],
        },
      }),
    ).toThrow(ConfigError);
  });
});

/**
 * The quota denial namespaces on the result surface (RV1510). The
 * seventeenth comparison benchmark exported one conflated "retries"
 * number, and 17 pre-wire quota denials read as 17 provider retries;
 * the result now names the pre-wire denials per dimension, beside the
 * transportRetries the provider actually saw.
 */
describe('the quota denial namespaces on the result (RV1510)', () => {
  const denyOnceThenGrant = (reason: string): QuotaLimiter => {
    let call = 0;
    return {
      reserve: () => {
        call += 1;
        if (call === 1) {
          return Promise.resolve({ granted: false, retryAfterMs: 1, reason });
        }
        return Promise.resolve({ granted: true, reservationId: `r${String(call)}` });
      },
      reconcile: () => Promise.resolve(),
    };
  };

  it('a requests-window denial lands in the requests dimension, live telemetry only', async () => {
    const adapter = answeringAdapter();
    const outcome = await engineWith(adapter, {
      limiter: denyOnceThenGrant('requestsPerMinute 36 exhausted'),
    }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    const result = (
      outcome as {
        value: {
          quotaDenials?: { total: number; requests: number; tokens: number; recovered: number };
        };
      }
    ).value;
    expect(result.quotaDenials).toEqual({ total: 1, requests: 1, tokens: 0, recovered: 1 });
    // The denial never reached the wire: exactly one paid call.
    expect(adapter.calls.length).toBe(1);
  });

  it('a token-window denial lands in the tokens dimension', async () => {
    const adapter = answeringAdapter();
    const outcome = await engineWith(adapter, {
      limiter: denyOnceThenGrant('tokensPerMinute 90000 exhausted'),
    }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    const result = (
      outcome as {
        value: { quotaDenials?: { total: number; requests: number; tokens: number } };
      }
    ).value;
    expect(result.quotaDenials).toMatchObject({ total: 1, requests: 0, tokens: 1 });
    expect(adapter.calls.length).toBe(1);
  });

  it('stays absent without denials, the transportRetries rule', async () => {
    const limiter = memoryQuotaLimiter([{ requestsPerMinute: 100 }]);
    const outcome = await engineWith(answeringAdapter(), { limiter }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    const result = (outcome as { value: { quotaDenials?: unknown } }).value;
    expect(result.quotaDenials).toBeUndefined();
  });
});

describe('the retry namespace separation (RV1601, the eighteenth comparison benchmark)', () => {
  type NamespacedResult = {
    status: string;
    error?: { kind: string };
    servedBy?: string;
    transportRetries?: number;
    quotaDenials?: { total: number; requests: number; tokens: number; recovered: number };
    providerCalls?: Array<{ attempt: number; outcome: string }>;
  };
  const valueOf = (outcome: unknown): NamespacedResult =>
    (outcome as { value: NamespacedResult }).value;
  const denyThenGrant = (denials: number, reason: string): QuotaLimiter & { reserves: number } => {
    const limiter = {
      reserves: 0,
      reserve: (): Promise<QuotaDecision> => {
        limiter.reserves += 1;
        if (limiter.reserves <= denials) {
          return Promise.resolve({ granted: false, retryAfterMs: 1, reason });
        }
        return Promise.resolve({ granted: true, reservationId: `r${String(limiter.reserves)}` });
      },
      reconcile: () => Promise.resolve(),
    };
    return limiter;
  };

  it('a recovered denial is not a transport retry: retryCount stays absent, the record says attempt 1', async () => {
    const adapter = answeringAdapter();
    const handle = engineWith(adapter, {
      limiter: denyThenGrant(1, 'requestsPerMinute 9 exhausted'),
    }).run(askWf, undefined);
    const errors: Array<{ willRetry?: boolean; source?: unknown }> = [];
    const denied: Array<{ reason?: string }> = [];
    const ends: Array<{ retryCount?: number }> = [];
    void (async () => {
      for await (const event of handle.events) {
        if (event.type === 'agent:error') {
          errors.push({
            willRetry: event.willRetry,
            source: (event.error.data as { source?: unknown } | undefined)?.source,
          });
        }
        if (event.type === 'quota:denied') {
          denied.push({ reason: event.reason });
        }
        if (event.type === 'agent:end') {
          ends.push({ retryCount: event.retryCount });
        }
      }
    })();
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const result = valueOf(outcome);
    expect(result.status).toBe('ok');
    // The denial stays in ITS namespace: no transport retry was made.
    expect(result.transportRetries).toBeUndefined();
    expect(result.quotaDenials).toEqual({ total: 1, requests: 1, tokens: 0, recovered: 1 });
    // The one dispatched call is try number one on the serving target;
    // the pre-wire denial never advanced the ordinal.
    expect(result.providerCalls).toHaveLength(1);
    expect(result.providerCalls?.[0]).toMatchObject({ attempt: 1, outcome: 'ok' });
    expect(adapter.calls.length).toBe(1);
    // The denial is diagnosable on the stream by ITS OWN type (RV1810):
    // the recoverable wait no longer wears agent:error by default.
    expect(errors).toEqual([]);
    expect(denied).toEqual([{ reason: 'requestsPerMinute 9 exhausted' }]);
    expect(ends).toHaveLength(1);
    expect(ends[0]?.retryCount).toBeUndefined();
  });

  it('denials do not consume the transport retry budget', async () => {
    // Three consecutive denials under attempts 2: the old conflation
    // exhausted the transport budget before the wire ever opened.
    const adapter = answeringAdapter();
    const limiter = denyThenGrant(3, 'tokensPerMinute 1000 exhausted');
    const outcome = await engineWith(adapter, { limiter }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    const result = valueOf(outcome);
    expect(result.status).toBe('ok');
    expect(adapter.calls.length).toBe(1);
    // One denial EPISODE recovered, three denials counted.
    expect(result.quotaDenials).toEqual({ total: 3, requests: 0, tokens: 3, recovered: 1 });
    expect(result.transportRetries).toBeUndefined();
  });

  it('a denial, a transport failure, and a success keep their namespaces and ordinals apart', async () => {
    const transient = {
      code: 'agent',
      message: 'down',
      retryable: true,
      data: { kind: 'transport' as const },
    };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { error: transient }
        : {
            text: 'answered',
            usage: { inputTokens: 12, outputTokens: 7, cacheReadTokens: 0, cacheWriteTokens: 0 },
          },
    );
    const outcome = await engineWith(adapter, {
      limiter: denyThenGrant(1, 'requestsPerMinute 9 exhausted'),
    }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    const result = valueOf(outcome);
    expect(result.status).toBe('ok');
    // The ledger enumerates the two DISPATCHED tries, 1-based; the
    // denial sits only in its own counters.
    expect(result.providerCalls?.map((row) => [row.attempt, row.outcome])).toEqual([
      [1, 'error'],
      [2, 'ok'],
    ]);
    expect(result.transportRetries).toBe(1);
    expect(result.quotaDenials).toEqual({ total: 1, requests: 1, tokens: 0, recovered: 1 });
  });

  it('the denial budget is its own bound: maxDenials reservations, then the rate-limit terminal', async () => {
    // maxDenials 3 above attempts 2 discriminates the bounds: the old
    // conflation stopped at two reservations.
    const adapter = answeringAdapter();
    const limiter = denyThenGrant(Number.POSITIVE_INFINITY, 'requestsPerMinute 9 exhausted');
    const outcome = await engineWith(adapter, { limiter, maxDenials: 3 }).run(askWf, undefined)
      .result;
    expect(outcome.status).toBe('ok');
    const result = valueOf(outcome);
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('rate-limit');
    expect(limiter.reserves).toBe(3);
    expect(adapter.calls.length).toBe(0);
    expect(result.quotaDenials).toMatchObject({ total: 3, recovered: 0 });
    expect(result.transportRetries).toBeUndefined();
  });

  it('an exhausted denial budget still fails over: the fallback serves under its own model', async () => {
    const seen: QuotaReservationRequest[] = [];
    const limiter: QuotaLimiter = {
      reserve: (request) => {
        seen.push(request);
        if (request.provider === 'primary') {
          return Promise.resolve({ granted: false, retryAfterMs: 1, reason: 'window full' });
        }
        return Promise.resolve({ granted: true, reservationId: `r${String(seen.length)}` });
      },
      reconcile: () => Promise.resolve(),
    };
    const primary = answeringAdapter('primary');
    const backup = answeringAdapter('backup');
    const engine = createEngine({
      adapters: [primary, backup],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: {
        routing: { loop: { model: 'primary:model', fallbacks: ['backup:model-b'] } },
        retry: fastRetry,
      },
      quota: { limiter, maxDenials: 1 },
    });
    const outcome = await engine.run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    const result = valueOf(outcome);
    expect(result.status).toBe('ok');
    expect(result.servedBy).toBe('backup:model-b');
    expect(primary.calls.length).toBe(0);
    expect(backup.calls.length).toBe(1);
    expect(seen.filter((request) => request.provider === 'primary')).toHaveLength(1);
  });

  it('maxDenials validates at createEngine intake', () => {
    const limiter: QuotaLimiter = {
      reserve: () => Promise.resolve({ granted: true, reservationId: 'r1' }),
      reconcile: () => Promise.resolve(),
    };
    for (const maxDenials of [0, -1, 1.5]) {
      expect(() => engineWith(answeringAdapter(), { limiter, maxDenials })).toThrow(ConfigError);
    }
  });
});

describe('quota:denied is the primary event for recoverable waits (RV1810)', () => {
  const denyOnceLimiter = (): QuotaLimiter => {
    let denials = 1;
    return {
      reserve: () => {
        if (denials > 0) {
          denials -= 1;
          return Promise.resolve({
            granted: false,
            retryAfterMs: 1,
            reason: 'tokensPerMinute 1800000 exhausted',
          });
        }
        return Promise.resolve({ granted: true, reservationId: 'r-granted' });
      },
      reconcile: () => Promise.resolve(),
    };
  };

  it('a recovered denial emits quota:denied and NO agent:error by default', async () => {
    const adapter = answeringAdapter();
    const handle = engineWith(adapter, { limiter: denyOnceLimiter() }).run(askWf, undefined);
    const denied: Array<Record<string, unknown>> = [];
    const errors: Array<Record<string, unknown>> = [];
    handle.on('quota:denied', (event) => denied.push(event as unknown as Record<string, unknown>));
    handle.on('agent:error', (event) => errors.push(event as unknown as Record<string, unknown>));
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    // The wait speaks its own type: healthy throttling, not failure.
    expect(denied).toHaveLength(1);
    expect(denied[0]?.model).toBe('fake:model');
    expect(denied[0]?.reason).toBe('tokensPerMinute 1800000 exhausted');
    expect(denied[0]?.retryAfterMs).toBe(1);
    expect(denied[0]?.willRetry).toBe(true);
    expect(errors).toHaveLength(0);
    // One wire call: the denial itself never reached the provider.
    expect(adapter.calls).toHaveLength(1);
  });

  it('the versioned compat flag restores the legacy agent:error twin', async () => {
    const adapter = answeringAdapter();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' }, retry: fastRetry },
      quota: { limiter: denyOnceLimiter() },
      telemetry: { quotaDeniedAgentError: true },
    });
    const handle = engine.run(askWf, undefined);
    const denied: unknown[] = [];
    const errors: Array<{ error?: { data?: { source?: string } } }> = [];
    handle.on('quota:denied', (event) => denied.push(event));
    handle.on('agent:error', (event) => errors.push(event as never));
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(denied).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.error?.data?.source).toBe('quota-limiter');
  });

  it('terminal denial exhaustion still ends in the real agent:error', async () => {
    const alwaysDeny: QuotaLimiter = {
      reserve: () =>
        Promise.resolve({ granted: false, retryAfterMs: 1, reason: 'window shut for good' }),
      reconcile: () => Promise.resolve(),
    };
    const adapter = answeringAdapter();
    const handle = engineWith(adapter, { limiter: alwaysDeny }).run(askWf, undefined);
    const denied: unknown[] = [];
    const errors: Array<{ willRetry?: boolean }> = [];
    handle.on('quota:denied', (event) => denied.push(event));
    handle.on('agent:error', (event) => errors.push(event as never));
    const outcome = await handle.result;
    // result: 'full' returns the error ENVELOPE instead of throwing.
    expect(outcome.status).toBe('ok');
    const settled = (outcome as { value: { status: string } }).value;
    expect(settled.status).toBe('error');
    // Every recoverable wait spoke quota:denied; the exhaustion spoke
    // the real terminal agent:error, exactly as before.
    expect(denied.length).toBeGreaterThan(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((event) => event.willRetry !== true)).toBe(true);
    expect(adapter.calls).toHaveLength(0);
  });

  it('a malformed telemetry flag refuses at createEngine, typed', () => {
    expect(() =>
      createEngine({
        adapters: [answeringAdapter()],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        defaults: { routing: { loop: 'fake:model' } },
        telemetry: { quotaDeniedAgentError: 'yes' as unknown as boolean },
      }),
    ).toThrow(/telemetry\.quotaDeniedAgentError must be a boolean/);
  });
});

describe('the scope-bound reservation (RV4205)', () => {
  it("tenantFrom 'scope' reads the run scope's tenant and stamps the dimensions", async () => {
    const seen: QuotaReservationRequest[] = [];
    const limiter: QuotaLimiter = {
      reserve: (request) => {
        seen.push(request);
        return Promise.resolve({ granted: true, reservationId: 'r1' });
      },
      reconcile: () => Promise.resolve(),
    };
    const outcome = await engineWith(answeringAdapter(), {
      limiter,
      tenant: 'engine-tenant',
      tenantFrom: 'scope',
    }).run(askWf, undefined, {
      scope: { tenant: 'run-tenant', region: 'eu-central-1', legalDomain: 'eu-gdpr' },
    }).result;
    expect(outcome.status).toBe('ok');
    expect(seen[0]?.tenant).toBe('run-tenant');
    expect(seen[0]?.scope).toEqual({
      tenant: 'run-tenant',
      region: 'eu-central-1',
      legalDomain: 'eu-gdpr',
    });
  });

  it("tenantFrom 'scope' on an unscoped run reserves tenant-less, never the engine's", async () => {
    const seen: QuotaReservationRequest[] = [];
    const limiter: QuotaLimiter = {
      reserve: (request) => {
        seen.push(request);
        return Promise.resolve({ granted: true, reservationId: 'r1' });
      },
      reconcile: () => Promise.resolve(),
    };
    const outcome = await engineWith(answeringAdapter(), {
      limiter,
      tenant: 'engine-tenant',
      tenantFrom: 'scope',
    }).run(askWf, undefined).result;
    expect(outcome.status).toBe('ok');
    expect('tenant' in (seen[0] ?? {})).toBe(false);
  });

  it('the default keeps the engine tenant byte for byte, scope beside it', async () => {
    const seen: QuotaReservationRequest[] = [];
    const limiter: QuotaLimiter = {
      reserve: (request) => {
        seen.push(request);
        return Promise.resolve({ granted: true, reservationId: 'r1' });
      },
      reconcile: () => Promise.resolve(),
    };
    await engineWith(answeringAdapter(), { limiter, tenant: 'acme' }).run(askWf, undefined, {
      scope: { tenant: 'run-tenant', account: 'prod' },
    }).result;
    expect(seen[0]?.tenant).toBe('acme');
    expect(seen[0]?.scope).toEqual({ tenant: 'run-tenant', account: 'prod' });
  });

  it('a garbage tenantFrom refuses typed at createEngine', () => {
    expect(() =>
      engineWith(answeringAdapter(), {
        limiter: {
          reserve: () => Promise.resolve({ granted: true, reservationId: 'x' }),
          reconcile: () => Promise.resolve(),
        },
        tenantFrom: 'vibes' as never,
      }),
    ).toThrow(/tenantFrom must be 'engine' or 'scope'/);
  });
});
