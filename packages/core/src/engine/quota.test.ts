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
import type { QuotaLimiter, QuotaReservationRequest } from '../l0/spi/quota.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { QUOTA_WINDOW_MS, memoryQuotaLimiter } from '../model/quota.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { testCaps } from './test-harness.js';

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
