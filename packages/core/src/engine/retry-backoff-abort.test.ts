/**
 * Interruptible retry backoff at the engine surface (v1.28.0 review
 * P1), reproduced on published 1.28.0 before the fix: a provider
 * supplied retryAfterMs armed an uninterruptible sleep, so a
 * requested cancel, a crossed run deadline, and a crossed budget
 * ceiling all waited out the full backoff and the adapter was
 * dispatched again after the abort. The engine owns retries and wall
 * clock; these tests pin prompt settlement (the 5000 ms backoff must
 * never be waited out) and the no dispatch after abort guarantee on
 * the real timer path.
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { testCaps } from './test-harness.js';

const retry2 = { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 1 } };

const rateLimited = (retryAfterMs: number): ChatEvent => ({
  type: 'error',
  error: {
    code: 'agent',
    message: 'rate limited',
    retryable: true,
    data: { kind: 'rate-limit', retryAfterMs },
  },
});

function engineWith(adapter: ProviderAdapter) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: new InMemoryStore({ quiet: true }) },
    defaults: { routing: { loop: 'fake:model' } },
  });
}

describe('backoff interruption on the native timer path (v1.28.0 review P1)', () => {
  it('handle.cancel during a 5000 ms backoff settles promptly with one adapter call', async () => {
    const calls: ChatRequest[] = [];
    const adapter: ProviderAdapter = {
      id: 'fake',
      caps: () => testCaps(),
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        calls.push(req);
        yield rateLimited(5000);
      },
    };
    const wf = defineWorkflow({ name: 'cancel-backoff' }, (ctx) =>
      ctx.agent('go', { retry: retry2 }),
    );
    const handle = engineWith(adapter).run(wf, undefined);
    // The willRetry telemetry is emitted right before the backoff
    // arms, so waiting for it (plus a beat) places the cancel inside
    // the 5000 ms sleep rather than inside the stream.
    for await (const event of handle.events) {
      if (event.type === 'agent:error' && (event as { willRetry?: boolean }).willRetry === true) {
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    const cancelledAt = Date.now();
    await handle.cancel('caller asked');
    const outcome = await handle.result;

    expect(outcome.status).toBe('cancelled');
    expect(Date.now() - cancelledAt).toBeLessThan(2500);
    expect(calls).toHaveLength(1);
  });

  it('a crossed run deadline interrupts the backoff instead of waiting it out', async () => {
    const calls: ChatRequest[] = [];
    const adapter: ProviderAdapter = {
      id: 'fake',
      caps: () => testCaps(),
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        calls.push(req);
        yield rateLimited(5000);
      },
    };
    const wf = defineWorkflow({ name: 'deadline-backoff' }, (ctx) =>
      ctx.agent('go', { retry: retry2 }),
    );
    const startedAt = Date.now();
    const outcome = await engineWith(adapter).run(wf, undefined, {
      deadlineAt: new Date(Date.now() + 50).toISOString(),
    }).result;

    expect(outcome.status).toBe('cancelled');
    expect(Date.now() - startedAt).toBeLessThan(2500);
    expect(calls).toHaveLength(1);
  });

  it('a budget crossing interrupts the backoff, settles exhausted, and keeps the paid usage', async () => {
    const calls: ChatRequest[] = [];
    const adapter: ProviderAdapter = {
      id: 'fake',
      caps: () => testCaps(),
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        calls.push(req);
        // 1.5M input tokens at 1 USD per Mtok crosses the 1 USD
        // ceiling through the mid stream inlet, then the retryable
        // error asks for a 5000 ms backoff the abort must interrupt.
        yield { type: 'usage', usage: { inputTokens: 1_500_000, outputTokens: 0 } };
        yield rateLimited(5000);
      },
    };
    const wf = defineWorkflow({ name: 'budget-backoff' }, (ctx) =>
      ctx.agent('go', { retry: retry2 }),
    );
    const startedAt = Date.now();
    const outcome = await engineWith(adapter).run(wf, undefined, { budgetUsd: 1 }).result;

    expect(outcome.status).toBe('exhausted');
    expect(Date.now() - startedAt).toBeLessThan(2500);
    expect(calls).toHaveLength(1);
    expect(outcome.usage.inputTokens).toBe(1_500_000);
  });
});
