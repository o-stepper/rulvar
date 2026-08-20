/**
 * The synthesize-span vocabulary classification (RV4206, the sixth
 * comparison experiment). The citation entailment judge (RV4004) rides
 * role 'synthesize' under its own label, and NEITHER reducer knew the
 * name: the run's `finalCompositionMs` read 368889 ms of which 154019
 * was the judge, `compositionSpans: 2` faked the legible signature of
 * a repair round on a run that had none, and `lastCandidateMs`
 * stretched 154 seconds past the moment the accepted candidate
 * settled. Both folds now classify through ONE function
 * (`synthesizeSpanClassOf`, the RV3302 doctrine extended to the whole
 * vocabulary), and a label neither judge nor composition lands in an
 * explicit unclassified bucket instead of silently reading as
 * composition.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from './entries.js';
import type { WorkflowEvent } from './events.js';
import {
  CITATION_JUDGE_LABEL,
  CLAIM_JUDGE_LABEL,
  FINAL_COMPOSITION_LABEL,
  SYNTHESIS_NOTE_LABEL,
  citationJudgePassOf,
  reduceCriticalPath,
  synthesizeSpanClassOf,
} from './telemetry-reduce.js';
import { criticalPathFromJournal } from '../stores/critical-path.js';

const at = (ms: number): string => new Date(1700000000000 + ms).toISOString();
const ev = (body: Record<string, unknown>): WorkflowEvent => body as unknown as WorkflowEvent;

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
    startedAt: at(from),
    endedAt: at(to),
    ...(costAttribution === undefined ? {} : { costAttribution }),
  }) as unknown as JournalEntry;

const settle = (seq: number, ms: number): JournalEntry =>
  ({
    seq,
    kind: 'decision',
    scope: '',
    status: 'ok',
    startedAt: at(ms),
    value: { decisionType: 'run_settle', runStatus: 'ok', segment: seq },
  }) as unknown as JournalEntry;

describe('synthesizeSpanClassOf (RV4206)', () => {
  it('classifies the whole engine vocabulary, absence included', () => {
    expect(synthesizeSpanClassOf(CLAIM_JUDGE_LABEL)).toBe('claim-judge');
    expect(synthesizeSpanClassOf(`${CLAIM_JUDGE_LABEL}-final`)).toBe('claim-judge');
    expect(synthesizeSpanClassOf(CITATION_JUDGE_LABEL)).toBe('citation-judge');
    expect(synthesizeSpanClassOf(`${CITATION_JUDGE_LABEL}-round`)).toBe('citation-judge');
    expect(synthesizeSpanClassOf(FINAL_COMPOSITION_LABEL)).toBe('composition');
    expect(synthesizeSpanClassOf(SYNTHESIS_NOTE_LABEL)).toBe('composition');
    // Absence keeps its historical reading: pre-RV2901 streams carry
    // no labels and composition was the only unlabelled dispatch.
    expect(synthesizeSpanClassOf(undefined)).toBe('composition');
    // A PRESENT unknown label is a new vocabulary member, never
    // silently a composition: that silence is how the citation judge
    // hid inside finalCompositionMs for four releases.
    expect(synthesizeSpanClassOf('mystery-synthesis')).toBe('unclassified');
    expect(citationJudgePassOf(CITATION_JUDGE_LABEL)).toBe('first');
    expect(citationJudgePassOf(`${CITATION_JUDGE_LABEL}-round`)).toBe('round');
    expect(citationJudgePassOf(CLAIM_JUDGE_LABEL)).toBeUndefined();
  });
});

describe('the sixth comparison run decomposes (RV4206)', () => {
  // The run's own post-fan-in arithmetic: last worker settles at
  // 100000, one coordination draft activation of 344760 ms, the
  // composition 214870 ms, the claim judge 100825 ms, the citation
  // judge 154019 ms, run end 42 ms later. The published breakdown read
  // finalCompositionMs 368889 (composition PLUS citation judge) and
  // this fixture is the regression: 368889 must decompose.
  const events = [
    ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
    ev({ type: 'agent:start', ts: at(0), spanId: 'root', role: 'orchestrate' }),
    ev({ type: 'agent:start', ts: at(0), spanId: 'w1', role: 'loop' }),
    ev({ type: 'agent:end', ts: at(100000), spanId: 'w1' }),
    ev({
      type: 'agent:phase:end',
      ts: at(444760),
      spanId: 'root',
      invocation: 1,
      role: 'orchestrate',
      model: 'm',
      durationMs: 344760,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0,
    }),
    ev({
      type: 'agent:start',
      ts: at(444760),
      spanId: 'synth',
      role: 'synthesize',
      label: FINAL_COMPOSITION_LABEL,
    }),
    ev({ type: 'agent:end', ts: at(659630), spanId: 'synth' }),
    ev({
      type: 'agent:start',
      ts: at(659630),
      spanId: 'claim-judge',
      role: 'synthesize',
      label: `${CLAIM_JUDGE_LABEL}-final`,
    }),
    ev({ type: 'agent:end', ts: at(760455), spanId: 'claim-judge' }),
    ev({
      type: 'agent:start',
      ts: at(760455),
      spanId: 'citation-judge',
      role: 'synthesize',
      label: CITATION_JUDGE_LABEL,
    }),
    ev({ type: 'agent:end', ts: at(914474), spanId: 'citation-judge' }),
    ev({ type: 'agent:end', ts: at(914516), spanId: 'root' }),
    ev({ type: 'run:end', ts: at(914516), spanId: 'run' }),
  ];

  it('splits the live post-fan-in window into named buckets with bounded residue', () => {
    const path = reduceCriticalPath(events);
    // The regression itself: the published 368889 was two buckets.
    expect(path.finalCompositionMs).toBe(214870);
    expect(path.citationJudgeMs).toBe(154019);
    expect(path.finalCompositionMs + path.citationJudgeMs).toBe(368889);
    expect(path.semanticJudgeMs).toBe(100825);
    expect(path.finalJudgeMs).toBe(100825);
    expect(path.unclassifiedSynthesisMs).toBe(0);
    expect(path.unclassifiedSynthesisSpans).toBe(0);
    // The judge is no longer a second composition: the span signature
    // of a repair round reads clean on a clean run.
    expect(path.compositionSpans).toBe(1);
    expect(path.citationJudgeSpans).toBe(1);
    expect(path.judgeSpans).toBe(1);
    // The candidate milestone is the COMPOSITION settle, not the end
    // of the verdict tail that judged it.
    expect(path.lastCandidateMs).toBe(659630);
    expect(path.postFanInMs).toBe(814516);
    const breakdown = path.postFanIn;
    expect(breakdown).toBeDefined();
    if (breakdown === undefined) {
      return;
    }
    expect(breakdown.coordinationModelMs).toBe(344760);
    expect(breakdown.finalCompositionMs).toBe(214870);
    expect(breakdown.semanticJudgeMs).toBe(100825);
    expect(breakdown.citationJudgeMs).toBe(154019);
    expect(breakdown.unclassifiedSynthesisMs).toBe(0);
    // coordination + composition + claimJudge + citationJudge cover
    // the window to within the run's own 42 ms of scheduling residue.
    expect(breakdown.coveredMs).toBe(814474);
    expect(breakdown.residueMs).toBe(42);
    expect(breakdown.residueMs).toBeLessThan(100);
  });

  it('folds the identical split out of the journal alone', () => {
    const path = criticalPathFromJournal([
      span(1, 0, 100000, { role: 'loop', agentType: 'worker' }),
      span(2, 444760, 659630, { role: 'synthesize', label: FINAL_COMPOSITION_LABEL }),
      span(3, 659630, 760455, { role: 'synthesize', label: `${CLAIM_JUDGE_LABEL}-final` }),
      span(4, 760455, 914474, { role: 'synthesize', label: CITATION_JUDGE_LABEL }),
      settle(5, 914516),
    ]);
    expect(path.finalCompositionMs).toBe(214870);
    expect(path.citationJudgeMs).toBe(154019);
    expect(path.semanticJudgeMs).toBe(100825);
    expect(path.unclassifiedSynthesisMs).toBe(0);
    expect(path.unclassifiedSynthesisSpans).toBe(0);
    expect(path.compositionSpans).toBe(1);
    expect(path.citationJudgeSpans).toBe(1);
    expect(path.lastCandidateMs).toBe(659630);
    expect(path.postFanIn?.finalCompositionMs).toBe(214870);
    expect(path.postFanIn?.semanticJudgeMs).toBe(100825);
    expect(path.postFanIn?.citationJudgeMs).toBe(154019);
    expect(path.postFanIn?.unclassifiedSynthesisMs).toBe(0);
  });
});

describe('an unknown synthesize label is a named floor, never a composition (RV4206)', () => {
  it('buckets it as unclassified on the live surface', () => {
    const path = reduceCriticalPath([
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(0), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(40), spanId: 'w1' }),
      ev({
        type: 'agent:start',
        ts: at(40),
        spanId: 'synth',
        role: 'synthesize',
        label: FINAL_COMPOSITION_LABEL,
      }),
      ev({ type: 'agent:end', ts: at(60), spanId: 'synth' }),
      ev({
        type: 'agent:start',
        ts: at(60),
        spanId: 'novel',
        role: 'synthesize',
        label: 'evidence-summarizer',
      }),
      ev({ type: 'agent:end', ts: at(90), spanId: 'novel' }),
      ev({ type: 'run:end', ts: at(100), spanId: 'run' }),
    ]);
    expect(path.finalCompositionMs).toBe(20);
    expect(path.compositionSpans).toBe(1);
    expect(path.unclassifiedSynthesisMs).toBe(30);
    expect(path.unclassifiedSynthesisSpans).toBe(1);
    // The unknown span is not a candidate milestone either.
    expect(path.lastCandidateMs).toBe(60);
    expect(path.postFanIn?.unclassifiedSynthesisMs).toBe(30);
  });

  it('buckets it as unclassified in the journal fold', () => {
    const path = criticalPathFromJournal([
      span(1, 0, 400, { role: 'loop', agentType: 'worker' }),
      span(2, 400, 600, { role: 'synthesize', label: FINAL_COMPOSITION_LABEL }),
      span(3, 600, 900, { role: 'synthesize', label: 'evidence-summarizer' }),
      settle(4, 1000),
    ]);
    expect(path.finalCompositionMs).toBe(200);
    expect(path.compositionSpans).toBe(1);
    expect(path.unclassifiedSynthesisMs).toBe(300);
    expect(path.unclassifiedSynthesisSpans).toBe(1);
    expect(path.lastCandidateMs).toBe(600);
  });
});
