/**
 * Compaction at the ctx layer (M4-T03): the default-on pipeline with the
 * summarize-model fallback to the loop model, the low role-effort
 * default riding the fallback, and replay stability of a compacted run.
 */
import { describe, expect, it } from 'vitest';

import { COMPACTION_SUMMARY_PREFIX } from '../runtime/compaction.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const clock = tool({
  name: 'clock',
  description: 'tells the time',
  parameters: {},
  execute: () => Promise.resolve('12:00'),
});

describe('ctx compaction (M4-T03)', () => {
  it('falls back to the loop model for summarize and compacts at the profile threshold', async () => {
    // Call 0: tool turn with a big prompt; call 1: the summarize
    // invocation (identified by its trailing instruction); call 2: the
    // final loop turn over the compacted history.
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return {
          toolCall: { name: 'clock', args: {} },
          usage: { inputTokens: 120_000, outputTokens: 10 },
        };
      }
      if (call === 1) {
        return { text: 'a tight summary of the work' };
      }
      return { text: 'noon' };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: { longRunner: { tools: [clock], compaction: { threshold: 0.5 } } },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('track the time all day', { agentType: 'longRunner' });
    expect(result).toBe('noon');
    expect(adapter.calls).toHaveLength(3);

    // The summarize request fell back to the LOOP model and carries the
    // low role-effort default through the chain.
    const sumReq = adapter.calls[1];
    expect(sumReq?.effort).toBe('low');
    expect(sumReq?.toolChoice).toBe('none');

    // The final loop turn saw only the compacted history.
    const finalReq = adapter.calls[2];
    expect(finalReq?.messages).toHaveLength(2);
    const summary = finalReq?.messages[1]?.parts[0];
    expect(summary?.type === 'text' && summary.text.startsWith(COMPACTION_SUMMARY_PREFIX)).toBe(
      true,
    );

    // Replay of the whole spawn is free: no re-summarize, no calls.
    await internals.replayer.flush();
    const prior = await store.load('test-run');
    const replayAdapter = scriptedAdapter(() => ({ text: 'unused' }));
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      profiles: { longRunner: { tools: [clock], compaction: { threshold: 0.5 } } },
      priorEntries: prior,
    });
    const replayCtx = createCtx(resumed);
    const replayed = await replayCtx.agent('track the time all day', { agentType: 'longRunner' });
    expect(replayed).toBe('noon');
    expect(replayAdapter.calls).toHaveLength(0);
  });

  it('stays quiet below the default threshold', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'clock', args: {} } } : { text: 'noon' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('what time is it', { tools: [clock] });
    expect(result).toBe('noon');
    // Two loop turns, nothing else: no summarize call ever happened.
    expect(adapter.calls).toHaveLength(2);
  });
});
