/**
 * The critical path a journal already holds (RV2803): the same question
 * `reduceCriticalPath` answers from a live event stream, asked of what
 * survives the process that emitted it.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import type { ChatRequest } from '../l0/messages.js';
import type { WorkflowEvent } from '../l0/events.js';
import {
  CLAIM_JUDGE_LABEL,
  FINAL_COMPOSITION_LABEL,
  SYNTHESIS_NOTE_LABEL,
  isClaimJudgeLabel,
  reduceCriticalPath,
} from '../l0/telemetry-reduce.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from '../engine/engine.js';
import { defineWorkflow } from '../engine/ctx.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from '../orchestrator/orchestrate.js';
import { criticalPathFromJournal } from './critical-path.js';

const stamp = (ms: number): string => new Date(1_700_000_000_000 + ms).toISOString();

const agentTypeOf = (req: ChatRequest): string =>
  (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ?? '';

const handlesIn = (req: ChatRequest): number[] => {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number; handles?: number[] };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
        if (Array.isArray(result?.handles)) {
          handles.push(...result.handles.filter((h): h is number => typeof h === 'number'));
        }
      }
    }
  }
  return handles;
};

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

  it('classifies the judge identically to the live reducer (RV3302)', () => {
    // The 2026-08-12 comparison run: the final pass dispatched under
    // `claim-consistency-judge-final`, the journal fold split 224864
    // against 48059, and the live fold read the same 272923 ms window
    // as composition with semanticJudgeMs 0, because one surface
    // compared the label exactly while the other accepted the suffix.
    // Both folds now classify through one predicate, and this pins
    // that run's shape to the same split on both surfaces.
    expect(isClaimJudgeLabel(CLAIM_JUDGE_LABEL)).toBe(true);
    expect(isClaimJudgeLabel(`${CLAIM_JUDGE_LABEL}-final`)).toBe(true);
    expect(isClaimJudgeLabel('claim-consistency-judgement')).toBe(false);
    expect(isClaimJudgeLabel(FINAL_COMPOSITION_LABEL)).toBe(false);
    expect(isClaimJudgeLabel(undefined)).toBe(false);

    const journal = criticalPathFromJournal([
      span(1, 0, 201_042, { role: 'loop' }),
      span(2, 201_042, 425_906, { role: 'synthesize', label: FINAL_COMPOSITION_LABEL }),
      span(3, 425_906, 473_965, { role: 'synthesize', label: `${CLAIM_JUDGE_LABEL}-final` }),
      settle(4, 757_437),
    ]);
    const live = (body: Record<string, unknown>): WorkflowEvent => body as unknown as WorkflowEvent;
    const stream = reduceCriticalPath([
      live({ type: 'run:start', ts: stamp(0), spanId: 'run' }),
      live({ type: 'agent:start', ts: stamp(0), spanId: 'w', role: 'loop' }),
      live({ type: 'agent:end', ts: stamp(201_042), spanId: 'w' }),
      live({
        type: 'agent:start',
        ts: stamp(201_042),
        spanId: 's',
        role: 'synthesize',
        label: FINAL_COMPOSITION_LABEL,
      }),
      live({ type: 'agent:end', ts: stamp(425_906), spanId: 's' }),
      live({
        type: 'agent:start',
        ts: stamp(425_906),
        spanId: 'j',
        role: 'synthesize',
        label: `${CLAIM_JUDGE_LABEL}-final`,
      }),
      live({ type: 'agent:end', ts: stamp(473_965), spanId: 'j' }),
      live({ type: 'run:end', ts: stamp(757_437), spanId: 'run' }),
    ]);
    for (const path of [journal, stream] as const) {
      expect(path.synthesisMs).toBe(272_923);
      expect(path.finalCompositionMs).toBe(224_864);
      expect(path.semanticJudgeMs).toBe(48_059);
    }
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

  it('a real orchestrate run yields the split with NO host labelling (RV2901)', async () => {
    // The comparison run's journal refused the split because the final
    // composition dispatch stayed anonymous while the claim judge was
    // labelled. The engine now labels its own dispatch, so the journal
    // of a plain synthesis run answers by itself.
    const journal = new InMemoryStore({ quiet: true });
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'evidence' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'study' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft: the study holds' } } };
    });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'final: it holds' } } }),
      { id: 'strong' },
    );
    const engine = createEngine({
      adapters: [coordination, synthesis],
      stores: { journal },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const wf = makeOrchestratorWorkflow('hold the study', { synthesis: {} });
    const outcome = await engine.run(wf, undefined, { runId: 'CP-RV2901' }).result;
    expect([outcome.status, outcome.error?.message]).toEqual(['ok', undefined]);
    const entries = await journal.load('CP-RV2901');
    const path = criticalPathFromJournal(entries);
    // Present, not refused: every synthesize span carried the engine's
    // own label, so the whole bucket is attributable composition.
    expect(path.finalCompositionMs).toBe(path.synthesisMs);
    expect(path.semanticJudgeMs).toBe(0);
    const synthSpans = entries.filter(
      (entry) =>
        entry.kind === 'agent' &&
        entry.status === 'ok' &&
        entry.costAttribution?.role === 'synthesize',
    );
    expect(synthSpans.length).toBeGreaterThan(0);
    for (const entry of synthSpans) {
      expect(entry.costAttribution?.label).toBe(FINAL_COMPOSITION_LABEL);
    }
  });

  it('incremental synthesis notes journal their own label (RV2901)', async () => {
    const journal = new InMemoryStore({ quiet: true });
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'evidence' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'study A' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'study B' } },
          ],
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft: both hold' } } };
    });
    const notes = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'note: holds' } } }),
      { id: 'strong' },
    );
    const engine = createEngine({
      adapters: [coordination, notes],
      stores: { journal },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const wf = makeOrchestratorWorkflow('hold both studies', {
      synthesis: { mode: 'incremental' },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'CP-RV2901-NOTES' }).result;
    expect([outcome.status, outcome.error?.message]).toEqual(['ok', undefined]);
    const entries = await journal.load('CP-RV2901-NOTES');
    const noteSpans = entries.filter(
      (entry) =>
        entry.kind === 'agent' &&
        entry.status === 'ok' &&
        entry.costAttribution?.role === 'synthesize',
    );
    // One note per settled child, each carrying the note label, so the
    // offline split still holds and a reader can tell notes from a
    // final composition without guessing from their size.
    expect(noteSpans).toHaveLength(2);
    for (const entry of noteSpans) {
      expect(entry.costAttribution?.label).toBe(SYNTHESIS_NOTE_LABEL);
    }
    const path = criticalPathFromJournal(entries);
    expect(path.finalCompositionMs).toBe(path.synthesisMs);
    expect(path.semanticJudgeMs).toBe(0);
  });
});
