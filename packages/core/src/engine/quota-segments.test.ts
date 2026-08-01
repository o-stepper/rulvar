/**
 * Pre-wire continuation reservation at the engine seam (RV1013): the
 * StreamHooks contract between the engine and a multi-wire adapter.
 * The engine reserves each provider-side continuation in the limiter
 * BEFORE its egress under `quota.reserveContinuations`, a denial comes
 * back as the limiter's own rate-limit-class WireError (the wire never
 * leaves), the main settlement never double-counts individually
 * admitted segments, and a granted admission whose wire never left is
 * RELEASED back to the window when the finish names the true count.
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest } from '../l0/messages.js';
import type { ProviderAdapter, StreamHooks } from '../l0/spi/provider.js';
import type { QuotaDecision, QuotaLimiter } from '../l0/spi/quota.js';
import { memoryQuotaLimiter } from '../model/quota.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { testCaps } from './test-harness.js';

const USAGE = { inputTokens: 3, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 };

/**
 * A hook-honoring multi-wire adapter double: asks for `continuations`
 * segment admissions like a pause_turn absorption would, then finishes
 * claiming `claimWires` wire requests in the RV905 metadata. An
 * omitted `claimWires` finishes with NO wire metadata at all: a
 * hook-aware adapter that never names its wire set.
 */
function hookAdapter(spec: { continuations: number; claimWires?: number }): ProviderAdapter & {
  hookCalls: number[];
} {
  const holder = {
    hookCalls: [] as number[],
    id: 'fake',
    caps: () => testCaps(),
    async *stream(
      req: ChatRequest,
      signal?: AbortSignal,
      hooks?: StreamHooks,
    ): AsyncIterable<ChatEvent> {
      void req;
      void signal;
      await Promise.resolve();
      for (let segment = 2; segment <= spec.continuations + 1; segment += 1) {
        const denial = await hooks?.onContinuationSegment?.({ segment });
        holder.hookCalls.push(segment);
        if (denial !== undefined) {
          yield { type: 'error', error: denial };
          return;
        }
      }
      yield { type: 'text-delta', text: 'done' };
      const claimed = spec.claimWires;
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: USAGE,
        ...(claimed === undefined
          ? {}
          : {
              providerMetadata: {
                fake: {
                  wireRequests: {
                    count: claimed,
                    responseIds: Array.from({ length: claimed }, (_, i) => `w${String(i + 1)}`),
                  },
                },
              },
            }),
      };
    },
  };
  return holder;
}

function engineWith(adapter: ProviderAdapter, limiter: ReturnType<typeof memoryQuotaLimiter>) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: 'fake:model' } },
    quota: { limiter, reserveContinuations: true },
  });
}

const wf = defineWorkflow({ name: 'segments' }, async (ctx) => {
  await ctx.agent('go', { retry: { attempts: 1, backoff: { initialMs: 1, factor: 1, maxMs: 1 } } });
  return 'done';
});

describe('pre-wire continuation reservation at the engine seam (RV1013)', () => {
  it('a granted admission whose wire never left is released back to the window', async () => {
    // The adapter asks for TWO continuation admissions but its finish
    // names only 2 wires (one continuation flew): the excess grant is
    // an unused admission and returns to the window, so the window
    // ends at the true wire count.
    const adapter = hookAdapter({ continuations: 2, claimWires: 2 });
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 10 }]);
    const outcome = await engineWith(adapter, limiter).run(wf, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.hookCalls).toEqual([2, 3]);
    expect(limiter.snapshot()[0]?.requests).toBe(2);
  });

  it('a denied segment admission surfaces as the limiter rate-limit error and the wire never leaves', async () => {
    const adapter = hookAdapter({ continuations: 1, claimWires: 2 });
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 1 }]);
    const outcome = await engineWith(adapter, limiter).run(wf, undefined, {}).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('continuation');
    // The terminal code is normalized at settle; the CLASS survives in
    // data.kind and drives the provider-429 retry machinery.
    expect((outcome.error?.data as { kind?: string })?.kind).toBe('rate-limit');
    // The main admission consumed the window; the denied segment
    // consumed nothing.
    expect(limiter.snapshot()[0]?.requests).toBe(1);
  });

  it('an adapter unaware of the hook keeps the post-hoc settlement exactly (RV905 unchanged)', async () => {
    const adapter: ProviderAdapter = {
      id: 'fake',
      caps: () => testCaps(),
      async *stream(): AsyncIterable<ChatEvent> {
        await Promise.resolve();
        yield { type: 'text-delta', text: 'done' };
        yield {
          type: 'finish',
          finish: { reason: 'stop' },
          usage: USAGE,
          providerMetadata: {
            fake: { wireRequests: { count: 3, responseIds: ['w1', 'w2', 'w3'] } },
          },
        };
      },
    };
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 10 }]);
    const outcome = await engineWith(adapter, limiter).run(wf, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    // Zero segment admissions happened, so the main settlement still
    // adds the continuation difference: the window carries the true
    // wire count through the historical RV905 path.
    expect(limiter.snapshot()[0]?.requests).toBe(3);
  });

  it('a finish that names no wire count releases nothing: an unproven grant stays consumed', async () => {
    // The hook granted one continuation and the wire left; the finish
    // simply never names its wire set. Reading that absence as "one
    // wire flew" handed the grant straight back to the window, so a
    // hook-granting adapter that reports no count kept exactly the
    // capacity RV1013 admitted (RV1210).
    const adapter = hookAdapter({ continuations: 1 });
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 10 }]);
    const outcome = await engineWith(adapter, limiter).run(wf, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.hookCalls).toEqual([2]);
    // One main admission plus one granted segment, and nothing proves
    // either unused: the window keeps both.
    expect(limiter.snapshot()[0]?.requests).toBe(2);
  });
});

/** Records every limiter call in order; `reserve` parks on the gate. */
function gatedLimiter(): {
  limiter: QuotaLimiter;
  calls: string[];
  open: () => void;
} {
  const calls: string[] = [];
  let open = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  let minted = 0;
  const limiter: QuotaLimiter = {
    async reserve(): Promise<QuotaDecision> {
      minted += 1;
      const reservationId = `r${String(minted)}`;
      calls.push(`reserve:${reservationId}`);
      await gate;
      return { granted: true, reservationId };
    },
    async reconcile(reservationId: string): Promise<void> {
      calls.push(`reconcile:${reservationId}`);
      await Promise.resolve();
    },
    async release(reservationId: string): Promise<void> {
      calls.push(`release:${reservationId}`);
      await Promise.resolve();
    },
  };
  return { limiter, calls, open: () => open() };
}

/** Counts the wire calls that actually reached the adapter. */
function countingAdapter(): ProviderAdapter & { streams: number } {
  const holder = {
    streams: 0,
    id: 'fake',
    caps: () => testCaps(),
    async *stream(): AsyncIterable<ChatEvent> {
      holder.streams += 1;
      await Promise.resolve();
      yield { type: 'text-delta', text: 'done' };
      yield { type: 'finish', finish: { reason: 'stop' }, usage: USAGE };
    },
  };
  return holder;
}

describe('the abort recheck across an awaited reservation (RV1210)', () => {
  it('an abort while the reservation is awaited leaves no wire and RELEASES the admission', async () => {
    // A limiter that queues can hold a reservation for as long as the
    // window is full; an abort landing inside that wait used to be
    // invisible, so the wire left anyway and the run paid for a call
    // it had already been told to stop making.
    const adapter = countingAdapter();
    const { limiter, calls, open } = gatedLimiter();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
      quota: { limiter },
    });
    const handle = engine.run(wf, undefined, {});
    for (let attempt = 0; attempt < 500 && calls.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(calls).toEqual(['reserve:r1']);
    // requestCancel aborts synchronously, so the gate may open at once.
    const cancelling = handle.cancel('cancelled mid-reservation');
    open();
    await cancelling;
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(adapter.streams).toBe(0);
    // The admitted wire never left, so the admission RETURNS to the
    // window: a settlement only ever adds, and settling a call that
    // never happened would leave the request consumed forever.
    expect(calls).toContain('release:r1');
    expect(calls).not.toContain('reconcile:r1');
  });
});
