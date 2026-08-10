/**
 * The critical path a journal already holds (RV2803): the same question
 * `reduceCriticalPath` answers from a live event stream, asked of what
 * survives the process that emitted it.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import { CLAIM_JUDGE_LABEL } from '../l0/telemetry-reduce.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from '../engine/engine.js';
import { defineWorkflow } from '../engine/ctx.js';
import { scriptedAdapter } from '../engine/test-harness.js';
import { criticalPathFromJournal } from './critical-path.js';

const stamp = (ms: number): string => new Date(1_700_000_000_000 + ms).toISOString();

const span = (
  seq: number,
  from: number,
  to: number,
  costAttribution?: Record<string, unknown>,
): JournalEntry =>
  ({
    seq,
    kind: 'agent',
    scope: '',
    key: `k${String(seq)}`,
    status: 'ok',
    ref: seq - 1,
    startedAt: stamp(from),
    endedAt: stamp(to),
    ...(costAttribution === undefined ? {} : { costAttribution }),
  }) as unknown as JournalEntry;

const settle = (seq: number, at: number, runStatus = 'ok'): JournalEntry =>
  ({
    seq,
    kind: 'decision',
    scope: '',
    status: 'ok',
    startedAt: stamp(at),
    value: { decisionType: 'run_settle', runStatus, segment: seq },
  }) as unknown as JournalEntry;

describe('criticalPathFromJournal (RV2803)', () => {
  it('folds the fan-in shape a live stream reports, from the journal alone', () => {
    // Two workers settling at 400 and 600, a run closing at 1000: the
    // post-fan-in window is the last 400ms of a 1000ms run, which is
    // exactly the quantity RV2210's target rule is written about and
    // which no post-mortem could compute before.
    const path = criticalPathFromJournal([
      span(1, 0, 400, { role: 'loop', agentType: 'worker' }),
      span(2, 0, 600, { role: 'loop', agentType: 'worker' }),
      span(3, 600, 900, { role: 'synthesize', agentType: 'synth' }),
      settle(4, 1000),
    ]);
    expect(path.workerSpans).toBe(2);
    expect(path.runWallMs).toBe(1000);
    expect(path.postFanInMs).toBe(400);
    expect(path.postFanInShare).toBeCloseTo(0.4, 12);
    expect(path.synthesisMs).toBe(300);
    expect(path.synthesisShare).toBeCloseTo(0.3, 12);
    expect(path.unclassifiedSpans).toBe(0);
  });

  it('splits the synthesize bucket only when every span carried a label', () => {
    // RV1604 split it because reading the claim judge as a second final
    // composition misled a benchmark by 54 seconds, and that split rode
    // the event label alone until the attribution facts carried it.
    const labelled = criticalPathFromJournal([
      span(1, 0, 100, { role: 'loop' }),
      span(2, 100, 300, { role: 'synthesize', label: 'final-composition' }),
      span(3, 300, 350, { role: 'synthesize', label: CLAIM_JUDGE_LABEL }),
      span(4, 350, 380, { role: 'synthesize', label: `${CLAIM_JUDGE_LABEL}-final` }),
      settle(5, 400),
    ]);
    expect(labelled.synthesisMs).toBe(280);
    expect(labelled.finalCompositionMs).toBe(200);
    expect(labelled.semanticJudgeMs).toBe(80);

    // One unlabelled span makes the split a guess, so there is no split:
    // absence is NOT RECORDED, never zero (RV1209).
    const mixed = criticalPathFromJournal([
      span(1, 0, 100, { role: 'synthesize', label: CLAIM_JUDGE_LABEL }),
      span(2, 100, 300, { role: 'synthesize' }),
      settle(3, 400),
    ]);
    expect(mixed.synthesisMs).toBe(300);
    expect('finalCompositionMs' in mixed).toBe(false);
    expect('semanticJudgeMs' in mixed).toBe(false);
  });

  it('refuses the wall figures for a journal that was resumed', () => {
    // A killed run's journal holds the operator's coffee break between
    // its stamps. Reporting that as the run's duration would make every
    // share it feeds a fiction, so the wall is absent and the counts
    // that need no clock stay.
    const path = criticalPathFromJournal([
      span(1, 0, 400, { role: 'loop' }),
      settle(2, 500, 'suspended'),
      span(3, 9_000_000, 9_000_400, { role: 'loop' }),
      settle(4, 9_000_500),
    ]);
    expect(path.segments).toBe(2);
    expect(path.workerSpans).toBe(2);
    expect('runWallMs' in path).toBe(false);
    expect('postFanInMs' in path).toBe(false);
    expect('postFanInShare' in path).toBe(false);
  });

  it('counts what it could not classify instead of guessing a role', () => {
    // A journal older than the attribution facts: the spans are there
    // and their roles are not, so the worker count is a floor and the
    // fold says so rather than calling them all workers.
    const path = criticalPathFromJournal([
      span(1, 0, 400),
      span(2, 0, 500, { role: 'loop' }),
      settle(3, 600),
    ]);
    expect(path.workerSpans).toBe(1);
    expect(path.unclassifiedSpans).toBe(1);
    // The classified worker still anchors the window.
    expect(path.postFanInMs).toBe(100);
  });

  it('reads a REAL run, with the label the engine now journals', async () => {
    // End to end: the engine writes the spans, the fold reads them, and
    // the label the claim judge rides is in the journal rather than in
    // an event stream nobody kept.
    const journal = new InMemoryStore({ quiet: true });
    const wf = defineWorkflow({ name: 'critical-path-wf' }, async (ctx) => {
      await ctx.agent('work');
      await ctx.agent('judge it', { role: 'synthesize', label: CLAIM_JUDGE_LABEL });
      return 'done';
    });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'ok' }))],
      stores: { journal },
      defaults: { routing: { loop: 'fake:model', synthesize: 'fake:model' } },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'CP' }).result;
    expect([outcome.status, outcome.error?.message]).toEqual(['ok', undefined]);
    const path = criticalPathFromJournal(await journal.load('CP'));
    expect(path.segments).toBe(1);
    expect(path.workerSpans).toBe(1);
    expect(path.unclassifiedSpans).toBe(0);
    // The split is available because the dispatch was labelled, and it
    // attributes the whole synthesize bucket to the judge.
    expect(path.semanticJudgeMs).toBe(path.synthesisMs);
    expect(path.finalCompositionMs).toBe(0);
    expect(path.runWallMs).toBeGreaterThanOrEqual(0);
    expect(path.postFanInShare).toBeGreaterThanOrEqual(0);
  });

  it('reads an out-of-order array, because a journal is a set of entries', () => {
    // The segment partition walks in order; the bounds do not. Handed a
    // shuffled array, the fold must not report two segments or a wall
    // that never happened.
    const path = criticalPathFromJournal([
      settle(4, 1000),
      span(2, 0, 600, { role: 'loop' }),
      span(1, 0, 400, { role: 'loop' }),
    ]);
    expect(path.segments).toBe(1);
    expect(path.runWallMs).toBe(1000);
    expect(path.postFanInMs).toBe(400);
  });

  it('a journal with no agent entries reports no fan-in, not a zero share', () => {
    const path = criticalPathFromJournal([settle(1, 100)]);
    expect(path.workerSpans).toBe(0);
    expect('postFanInMs' in path).toBe(false);
    expect('postFanInShare' in path).toBe(false);
  });
});
