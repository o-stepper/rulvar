/**
 * Role trigger protocol at the ctx layer (M4-T01): the firing decisions
 * of docs/04, sections 8.3-8.4 as amended, wired through resolution,
 * toolset capture, and the agent loop. Acceptance (docs/10): no extra
 * extract call when the loop model can serve the tier; finalize fires
 * only when routed.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { EMIT_RESULT_TOOL } from '../runtime/structured-output.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter, testCaps } from './test-harness.js';

const clock = tool({
  name: 'clock',
  description: 'tells the time',
  parameters: {},
  execute: () => Promise.resolve('12:00'),
});

const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });

describe('extract necessity at the ctx layer (M4-T01)', () => {
  it('no extra extract call when the loop model serves the tier (acceptance)', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'clock', args: {} } } : { text: '{"verdict":"pass"}' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('judge the time', {
      tools: [clock],
      schema: verdictSchema,
    });
    expect(result).toEqual({ verdict: 'pass' });
    // Exactly the two loop turns: the schema rode the last one.
    expect(adapter.calls).toHaveLength(2);
    expect(adapter.calls[1]?.schema).toBeDefined();
  });

  it('a forced-tool loop model with tools cannot serve the ride: extract fires on the same model', async () => {
    const adapter = scriptedAdapter(
      (_req, call) => {
        if (call === 0) {
          return { toolCall: { name: 'clock', args: {} } };
        }
        if (call === 1) {
          return { text: 'the verdict is pass' };
        }
        return {
          toolCall: { name: EMIT_RESULT_TOOL, args: { verdict: 'pass' } },
          finish: 'tool-calls' as const,
        };
      },
      { caps: testCaps({ structuredOutput: 'forced-tool' }) },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('judge the time', {
      tools: [clock],
      schema: verdictSchema,
    });
    expect(result).toEqual({ verdict: 'pass' });
    expect(adapter.calls).toHaveLength(3);
    // The loop turns never carried the pinned emit_result choice.
    expect(adapter.calls[0]?.toolChoice).toBeUndefined();
    expect(adapter.calls[1]?.toolChoice).toBeUndefined();
    // The separate extract pins it, with the agent contracts present.
    expect(adapter.calls[2]?.toolChoice).toEqual({ name: EMIT_RESULT_TOOL });
    expect(adapter.calls[2]?.tools?.map((t) => t.name)).toEqual(['clock', EMIT_RESULT_TOOL]);
  });

  it('a forced-tool model with NO tools rides as in M1: no extra call', async () => {
    const adapter = scriptedAdapter(
      () => ({
        toolCall: { name: EMIT_RESULT_TOOL, args: { verdict: 'fail' } },
        finish: 'tool-calls' as const,
      }),
      { caps: testCaps({ structuredOutput: 'forced-tool' }) },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('judge', { schema: verdictSchema });
    expect(result).toEqual({ verdict: 'fail' });
    expect(adapter.calls).toHaveLength(1);
    expect(adapter.calls[0]?.toolChoice).toEqual({ name: EMIT_RESULT_TOOL });
  });
});

describe('finalize firing at the ctx layer (M4-T01)', () => {
  it('fires only when routed: an unrouted agent never pays a synthesis call', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'clock', args: {} } } : { text: 'noon' },
    );
    const strong = scriptedAdapter(() => ({ text: 'never' }), { id: 'strong' });
    const { internals } = makeInternals({
      adapters: [adapter, strong],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('what time is it', { tools: [clock] });
    expect(result).toBe('noon');
    expect(strong.calls).toHaveLength(0);
  });

  it('routed finalize synthesizes on its own model; the value replays from the journal', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'clock', args: {} } } : { text: 'raw notes' },
    );
    const strong = scriptedAdapter(() => ({ text: 'polished synthesis' }), { id: 'strong' });
    const { internals, store } = makeInternals({
      adapters: [adapter, strong],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('what time is it', {
      tools: [clock],
      routing: { finalize: 'strong:big' },
    });
    expect(result).toBe('polished synthesis');
    expect(strong.calls).toHaveLength(1);
    expect(strong.calls[0]?.toolChoice).toBe('none');
    expect(strong.calls[0]?.tools?.map((t) => t.name)).toEqual(['clock']);

    // The synthesis is part of the journaled value: replay is free.
    await internals.replayer.flush();
    const prior = await store.load('test-run');
    const replayLoop = scriptedAdapter(() => ({ text: 'unused' }));
    const replayStrong = scriptedAdapter(() => ({ text: 'unused' }), { id: 'strong' });
    const { internals: resumed } = makeInternals({
      adapters: [replayLoop, replayStrong],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const replayCtx = createCtx(resumed);
    const replayed = await replayCtx.agent('what time is it', {
      tools: [clock],
      routing: { finalize: 'strong:big' },
    });
    expect(replayed).toBe('polished synthesis');
    expect(replayLoop.calls).toHaveLength(0);
    expect(replayStrong.calls).toHaveLength(0);
  });

  it('never fires for a no-tools agent even when routed', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'the answer' }));
    const strong = scriptedAdapter(() => ({ text: 'never' }), { id: 'strong' });
    const { internals } = makeInternals({
      adapters: [adapter, strong],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('just answer', { routing: { finalize: 'strong:big' } });
    expect(result).toBe('the answer');
    expect(adapter.calls).toHaveLength(1);
    expect(strong.calls).toHaveLength(0);
  });
});
