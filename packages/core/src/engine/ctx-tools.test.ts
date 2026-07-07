import { describe, expect, it } from 'vitest';

import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const clock = tool({
  name: 'clock',
  description: 'tells the time',
  parameters: {},
  execute: () => Promise.resolve('12:00'),
});

function toolAgentScript() {
  return scriptedAdapter((_req, call) =>
    call === 0 ? { toolCall: { name: 'clock', args: {} } } : { text: 'noon' },
  );
}

describe('ctx.agent toolsetHash identity (M3-T01)', () => {
  it('journals the spawn under a tools-bearing content key and replays it for free', async () => {
    const adapter = toolAgentScript();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const first = await ctx.agent('what time is it', { tools: [clock] });
    expect(first).toBe('noon');
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    // Same tools, edited execute body: identical content key, replay hit.
    const editedClock = tool({
      name: 'clock',
      description: 'tells the time',
      parameters: {},
      execute: () => Promise.resolve('a completely different body'),
    });
    const replayAdapter = toolAgentScript();
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const replayCtx = createCtx(resumed);
    const replayed = await replayCtx.agent('what time is it', { tools: [editedClock] });
    expect(replayed).toBe('noon');
    expect(replayAdapter.calls).toHaveLength(0);
  });

  it('a version bump re-keys the spawn: live rerun instead of replay', async () => {
    const adapter = toolAgentScript();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    await ctx.agent('what time is it', { tools: [clock] });
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const bumped = tool({
      name: 'clock',
      description: 'tells the time',
      parameters: {},
      version: '2',
      execute: () => Promise.resolve('12:00'),
    });
    const rerunAdapter = toolAgentScript();
    const { internals: resumed } = makeInternals({
      adapters: [rerunAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const rerunCtx = createCtx(resumed);
    const rerun = await rerunCtx.agent('what time is it', { tools: [bumped] });
    expect(rerun).toBe('noon');
    // The bumped contract is a NEW content key: the call went live.
    expect(rerunAdapter.calls.length).toBeGreaterThan(0);
  });

  it('profile tools resolve when the call declares none', async () => {
    const adapter = toolAgentScript();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: { timekeeper: { tools: [clock] } },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('what time is it', { agentType: 'timekeeper' });
    expect(result).toBe('noon');
    expect(adapter.calls[0]?.tools?.map((t) => t.name)).toEqual(['clock']);
  });
});
