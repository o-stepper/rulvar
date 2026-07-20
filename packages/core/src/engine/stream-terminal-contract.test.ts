/**
 * Terminal stream contract enforcement (v1.27.0 review P1 and P2). The
 * two findings this pins, each reproduced on published 1.27.0 before
 * the fix:
 *
 * 1. Fail open on truncation: an adapter stream that drained naturally
 *    without any terminal event settled the call as `ok`, journaling a
 *    PARTIAL response as durable run truth, replayable as success with
 *    no provider call. The contract (docs/guide/adapter-authors,
 *    provider.ts) requires exactly one terminal event per stream and a
 *    retryable transport error for a drained stream without one.
 * 2. Post terminal acceptance: a `text-delta` after the terminal
 *    `finish` was appended into the successful value.
 *
 * The contract now: truncation is a retryable transport fault that
 * feeds the ordinary retry and failover machinery, a requested abort
 * (cancel, budget) stays a clean end with no fabricated provider
 * error, and consumption stops at the first terminal so nothing after
 * it can reach the value, the events, or the journal.
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const quickRetry = { attempts: 1, backoff: { initialMs: 1, factor: 1, maxMs: 1 } };

/** Yields one text delta, then drains with no terminal event. */
function truncatingAdapter(id = 'fake'): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id,
    calls,
    caps: () => testCaps(),
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      calls.push(req);
      yield { type: 'text-delta', text: 'PARTIAL_ONLY' };
    },
  };
}

function engineWith(adapters: ProviderAdapter[], store = new InMemoryStore({ quiet: true })) {
  return {
    store,
    engine: createEngine({
      adapters,
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    }),
  };
}

describe('fail closed on a drained stream without a terminal event (v1.27.0 review P1)', () => {
  it('the partial turn never settles ok: the run fails with a retryable transport fault', async () => {
    const adapter = truncatingAdapter();
    const { store, engine } = engineWith([adapter]);
    const wf = defineWorkflow({ name: 'trunc' }, (ctx) => ctx.agent('go', { retry: quickRetry }));
    const outcome = await engine.run(wf, undefined, { runId: 'trunc-1' }).result;

    expect(outcome.status).toBe('error');
    expect(outcome.value).toBeUndefined();
    expect(outcome.error?.message).toContain('without a terminal finish or error event');
    expect(adapter.calls).toHaveLength(1);

    // The truncated text is durable ONLY as a failure: no ok agent
    // terminal exists in the journal, and the run meta says error.
    const entries = await store.load('trunc-1');
    const agentEntries = entries.filter((entry) => entry.kind === 'agent');
    expect(agentEntries.length).toBeGreaterThan(0);
    expect(agentEntries.find((entry) => entry.status === 'ok')).toBeUndefined();
    const meta = (await store.listRuns()).find((run) => run.runId === 'trunc-1');
    expect(meta?.status).toBe('error');
  });

  it('truncation feeds the ordinary retry machinery: exactly attempts provider calls', async () => {
    const adapter = truncatingAdapter();
    const { engine } = engineWith([adapter]);
    const wf = defineWorkflow({ name: 'retry' }, (ctx) =>
      ctx.agent('go', { retry: { ...quickRetry, attempts: 2 } }),
    );
    const outcome = await engine.run(wf, undefined).result;

    expect(outcome.status).toBe('error');
    expect(adapter.calls).toHaveLength(2);
  });

  it('truncation triggers transport failover: the fallback completes the run', async () => {
    const primary = truncatingAdapter();
    const backup = scriptedAdapter(() => ({ text: 'served by backup' }), { id: 'backup' });
    const store = new InMemoryStore({ quiet: true });
    const engine = createEngine({
      adapters: [primary, backup],
      stores: { journal: store },
      defaults: { routing: { loop: { model: 'fake:model', fallbacks: ['backup:model-b'] } } },
    });
    const wf = defineWorkflow({ name: 'failover' }, (ctx) =>
      ctx.agent('go', { retry: { ...quickRetry, attempts: 2 } }),
    );
    const outcome = await engine.run(wf, undefined).result;

    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('served by backup');
    expect(primary.calls).toHaveLength(2);
    expect(backup.calls).toHaveLength(1);
  });

  it('a requested cancel stays a clean abort, never a fabricated provider error', async () => {
    let streamEntered: () => void = () => undefined;
    const entered = new Promise<void>((resolve) => {
      streamEntered = resolve;
    });
    const adapter: ProviderAdapter = {
      id: 'fake',
      caps: () => testCaps(),
      async *stream(_req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
        yield { type: 'text-delta', text: 'partial before cancel' };
        streamEntered();
        await new Promise<void>((resolve) => {
          if (signal?.aborted === true) {
            resolve();
          } else {
            signal?.addEventListener('abort', () => resolve(), { once: true });
          }
        });
      },
    };
    const { engine } = engineWith([adapter]);
    const wf = defineWorkflow({ name: 'cancelled' }, (ctx) => ctx.agent('go'));
    const handle = engine.run(wf, undefined);
    await entered;
    await handle.cancel('caller asked');
    const outcome = await handle.result;

    expect(outcome.status).toBe('cancelled');
    expect(outcome.error?.message ?? '').not.toContain('without a terminal');
  });

  it('a budget ceiling abort stays exhausted, never a fabricated provider error', async () => {
    const adapter: ProviderAdapter = {
      id: 'fake',
      caps: () => testCaps(),
      async *stream(_req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
        // 1.5M input tokens at 1 USD per Mtok crosses the 1 USD ceiling
        // through the mid stream inlet; the budget signal then aborts
        // this stream, which ends with no terminal event as documented.
        yield { type: 'usage', usage: { inputTokens: 1_500_000, outputTokens: 0 } };
        yield { type: 'text-delta', text: 'spending' };
        await new Promise<void>((resolve) => {
          if (signal?.aborted === true) {
            resolve();
          } else {
            signal?.addEventListener('abort', () => resolve(), { once: true });
          }
        });
      },
    };
    const { engine } = engineWith([adapter]);
    const wf = defineWorkflow({ name: 'ceiling' }, (ctx) => ctx.agent('go'));
    const outcome = await engine.run(wf, undefined, { budgetUsd: 1 }).result;

    expect(outcome.status).toBe('exhausted');
    expect(outcome.error?.message ?? '').not.toContain('without a terminal');
  });
});

describe('consumption stops at the first terminal (v1.27.0 review P2)', () => {
  it('text after finish never reaches the value, the events, or the journal', async () => {
    let pulledPastFinish = false;
    const adapter: ProviderAdapter = {
      id: 'fake',
      caps: () => testCaps(),
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        yield { type: 'text-delta', text: 'before' };
        yield {
          type: 'finish',
          finish: { reason: 'stop' },
          usage: { inputTokens: 3, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
        pulledPastFinish = true;
        yield { type: 'text-delta', text: 'MUST_NOT_APPEND' };
      },
    };
    const { store, engine } = engineWith([adapter]);
    const wf = defineWorkflow({ name: 'stopper' }, (ctx) => ctx.agent('go'));
    const handle = engine.run(wf, undefined, { runId: 'stop-1' });
    const deltas: string[] = [];
    const pump = (async () => {
      for await (const event of handle.events) {
        if (event.type === 'agent:stream') {
          deltas.push((event as { delta: string }).delta);
        }
      }
    })();
    const outcome = await handle.result;
    await pump;

    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('before');
    expect(pulledPastFinish).toBe(false);
    expect(deltas.join('')).not.toContain('MUST_NOT_APPEND');
    const entries = await store.load('stop-1');
    expect(JSON.stringify(entries)).not.toContain('MUST_NOT_APPEND');
  });
});
