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
import { memoryQuotaLimiter } from '../model/quota.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { testCaps } from './test-harness.js';

const USAGE = { inputTokens: 3, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 };

/**
 * A hook-honoring multi-wire adapter double: asks for `continuations`
 * segment admissions like a pause_turn absorption would, then finishes
 * claiming `claimWires` wire requests in the RV905 metadata.
 */
function hookAdapter(spec: { continuations: number; claimWires: number }): ProviderAdapter & {
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
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: USAGE,
        providerMetadata: {
          fake: {
            wireRequests: {
              count: spec.claimWires,
              responseIds: Array.from({ length: spec.claimWires }, (_, i) => `w${String(i + 1)}`),
            },
          },
        },
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
});
