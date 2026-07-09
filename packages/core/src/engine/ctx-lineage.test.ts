import { describe, expect, it } from 'vitest';

import { AdmissionRejectedError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { normalizeEntry } from '../l0/entries.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { defineWorkflow, executeWorkflow } from './ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const ROUTING = { loop: 'fake:model' } as const;

function lineageDecisions(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => {
    if (entry.kind !== 'decision') {
      return false;
    }
    const value = entry.value as { decisionType?: string; origin?: string } | undefined;
    return value?.decisionType === 'spawn-admission' && value.origin === 'ctx.agent';
  });
}

describe('ctx.agent lineage declarations (DEF-3; M7-T02)', () => {
  it('journals ONE spawn-admission decision before dispatch and replays it', async () => {
    const adapter = scriptedAdapter((): ScriptedTurn => ({ text: 'done' }));
    const transcripts = new InMemoryTranscriptStore();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      transcripts,
    });
    const wf = defineWorkflow({ name: 'root' }, async (ctx) => {
      return ctx.agent('analyze the corpus', { approach: 'Binary Search' });
    });
    const result = await executeWorkflow(internals, wf, undefined);
    expect(result).toBe('done');

    const entries = (await store.load('test-run')).map(normalizeEntry);
    const decisions = lineageDecisions(entries);
    expect(decisions).toHaveLength(1);
    const value = decisions[0]?.value as {
      childScope: string;
      spawnKey: string;
      lineage: {
        logicalTaskId: string;
        relation: string;
        approachTag: string;
        approachSig: string;
        sigVersion: number;
      };
    };
    expect(value.lineage.relation).toBe('first');
    expect(value.lineage.approachTag).toBe('binary-search');
    expect(value.lineage.sigVersion).toBe(1);
    // The decision precedes the dispatch entry it authorizes.
    const dispatch = entries.find((entry) => entry.kind === 'agent');
    expect(decisions[0].seq).toBeLessThan(dispatch!.seq);
    // The spawnKey pins recovery to the agent's content key.
    expect(value.spawnKey).toBe(dispatch!.key);

    // Resume: the replayed spawn re-reads the minted LTID from the entry
    // (never re-mints) and appends NO second decision, zero live calls.
    const resumedAdapter = scriptedAdapter((): ScriptedTurn => ({ text: 'MUST NOT RUN' }));
    const resumed = makeInternals({
      adapters: [resumedAdapter],
      routing: ROUTING,
      priorEntries: entries,
      store,
      transcripts,
    });
    const resumedResult = await executeWorkflow(resumed.internals, wf, undefined);
    expect(resumedResult).toBe('done');
    expect(resumedAdapter.calls).toHaveLength(0);
    expect(lineageDecisions((await store.load('test-run')).map(normalizeEntry))).toHaveLength(1);
  });

  it('rejects a second live attempt of a busy lineage with lineage_busy', async () => {
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const blocker = tool({
      name: 'block',
      description: 'holds the first attempt live',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
      execute: async () => {
        signalStarted();
        await gate;
        return 'unblocked';
      },
    });
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const text = JSON.stringify(req.messages);
      if (text.includes('attempt one')) {
        return text.includes('unblocked')
          ? { text: 'one done' }
          : { toolCall: { name: 'block', args: {} } };
      }
      return { text: 'two done' };
    });
    const { internals, store } = makeInternals({ adapters: [adapter], routing: ROUTING });
    const wf = defineWorkflow({ name: 'busy' }, async (ctx) => {
      const [first, second] = await ctx.parallel<unknown>([
        () =>
          ctx.agent('attempt one', {
            lineage: { continues: 'L-BUSY', causeRef: 1 },
            tools: [blocker],
          }),
        async () => {
          // Admit the competitor strictly while the first attempt sits
          // inside its tool call: journaled, dispatched, unsettled.
          await started;
          try {
            return await ctx.agent('attempt two', {
              lineage: { continues: 'L-BUSY', causeRef: 1 },
            });
          } catch (thrown) {
            return thrown;
          } finally {
            releaseGate();
          }
        },
      ]);
      return { first, second };
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as {
      first: string;
      second: unknown;
    };
    expect(outcome.first).toBe('one done');
    expect(outcome.second).toBeInstanceOf(AdmissionRejectedError);
    expect((outcome.second as AdmissionRejectedError).data).toMatchObject({
      reason: { code: 'lineage_busy' },
    });
    // The rejection is journaled and re-issues on replay without
    // re-evaluation (docs/03, 10.6).
    const entries = (await store.load('test-run')).map(normalizeEntry);
    const rejected = lineageDecisions(entries).filter(
      (entry) => (entry.value as { reject?: unknown }).reject !== undefined,
    );
    expect(rejected).toHaveLength(1);
  });

  it('exhausts maxAttemptsPerLogicalTask monotonically', async () => {
    const adapter = scriptedAdapter((): ScriptedTurn => ({ text: 'ok' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      lineageLimits: { maxAttemptsPerLogicalTask: 1 },
    });
    const wf = defineWorkflow({ name: 'exhaust' }, async (ctx) => {
      await ctx.agent('first attempt', { lineage: { continues: 'L-EXH', causeRef: 1 } });
      try {
        await ctx.agent('second attempt', { lineage: { continues: 'L-EXH', causeRef: 2 } });
        return 'unreachable';
      } catch (thrown) {
        return (thrown as AdmissionRejectedError).data;
      }
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toMatchObject({ reason: { code: 'lineage_exhausted' } });
  });

  it('rejects the renamed limit knob at engine construction (XF-10)', () => {
    expect(() =>
      makeInternals({
        adapters: [scriptedAdapter((): ScriptedTurn => ({ text: 'x' }))],
        routing: ROUTING,
        lineageLimits: { maxEscalationsPerNode: 3 },
      }),
    ).toThrow(/maxEscalationsPerLogicalTask/);
  });

  it('embeds lineage in ctx.workflow admission decisions', async () => {
    const adapter = scriptedAdapter((): ScriptedTurn => ({ text: 'child done' }));
    const { internals, store } = makeInternals({ adapters: [adapter], routing: ROUTING });
    const child = defineWorkflow({ name: 'child' }, async (ctx) => ctx.agent('inner'));
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      return ctx.workflow(child, undefined, { approach: 'split-merge' });
    });
    await executeWorkflow(internals, wf, undefined);
    const entries = (await store.load('test-run')).map(normalizeEntry);
    const admission = entries.find((entry) => {
      const value = entry.value as { decisionType?: string; origin?: string } | undefined;
      return value?.decisionType === 'spawn-admission' && value.origin === 'ctx.workflow';
    });
    const decision = (admission?.value as { decision?: { lineage?: { approachTag?: string } } })
      .decision;
    expect(decision?.lineage?.approachTag).toBe('split-merge');
  });
});
