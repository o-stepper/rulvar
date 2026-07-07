import { describe, expect, it } from 'vitest';

import { defineWorkflow, JournalMissError } from '@lurker/core';
import { createTestEngine } from './test-engine.js';
import { replayRun } from './replay-strict.js';

const wf = defineWorkflow({ name: 'r' }, async (ctx) => {
  const a = await ctx.agent('alpha', { agentType: 'worker' });
  const roll = ctx.random('jitter');
  return { a, roll };
});

describe('replayRun strict (M2-T10; docs/09 tier 3)', () => {
  it('replays a recorded journal with zero live calls and byte-identical folds', async () => {
    const engine = createTestEngine({ agents: { worker: 'recorded output' } });
    const first = engine.run(wf, undefined);
    const firstOutcome = await first.result;
    const journal = await engine.store.load(first.runId);

    const { outcome, preview } = await replayRun(wf, undefined, {
      journal,
      profiles: { worker: {} },
    });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual(firstOutcome.value);
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
  });

  it('throws JournalMissError at the exact miss on a divergent journal', async () => {
    const engine = createTestEngine({ agents: { worker: 'recorded output' } });
    const first = engine.run(wf, undefined);
    await first.result;
    const journal = await engine.store.load(first.runId);

    const divergent = defineWorkflow({ name: 'r' }, async (ctx) => {
      const a = await ctx.agent('alpha', { agentType: 'worker' });
      const b = await ctx.agent('INSERTED', { agentType: 'worker' });
      return { a, b };
    });
    await expect(
      replayRun(divergent, undefined, { journal, profiles: { worker: {} } }),
    ).rejects.toThrow(JournalMissError);
  });

  it('a journal with open suspensions finishes suspended with zero live calls', async () => {
    const suspendedWf = defineWorkflow({ name: 's' }, async (ctx) => {
      await ctx.agent('work', { agentType: 'worker' });
      return ctx.awaitExternal('gate');
    });
    const engine = createTestEngine({ agents: { worker: 'done' } });
    const first = engine.run(suspendedWf, undefined);
    const firstOutcome = await first.result;
    expect(firstOutcome.status).toBe('suspended');
    const journal = await engine.store.load(first.runId);

    const { outcome } = await replayRun(suspendedWf, undefined, {
      journal,
      profiles: { worker: {} },
    });
    expect(outcome.status).toBe('suspended');
    expect(outcome.pending).toHaveLength(1);
  });
});
