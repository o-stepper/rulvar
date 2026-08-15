/**
 * The synthesis candidates a journal already holds (RV2902): each
 * journaled finish verdict with the window of wall, wires, usage, and
 * priced cost that produced the candidate it judged. Born from the
 * ninth comparison run, whose accepted dossier could not say what its
 * one evidence-grade repair cost: both candidates sat inside a single
 * 177 second synthesize span with one price on it.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import type { ChatRequest } from '../l0/messages.js';
import { FINAL_COMPOSITION_LABEL } from '../l0/telemetry-reduce.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from '../engine/engine.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from '../orchestrator/orchestrate.js';
import {
  lastMechanicalRepairCostUsd,
  synthesisCandidatesFromJournal,
} from './synthesis-candidates.js';

const stamp = (ms: number): string => new Date(1_700_000_000_000 + ms).toISOString();

const running = (seq: number, spanId: string, from: number): JournalEntry =>
  ({
    seq,
    kind: 'agent',
    scope: '',
    key: `k${String(spanId)}`,
    status: 'running',
    spanId,
    startedAt: stamp(from),
  }) as unknown as JournalEntry;

const terminal = (
  seq: number,
  ref: number,
  spanId: string,
  from: number,
  to: number,
  extra: Record<string, unknown>,
): JournalEntry =>
  ({
    seq,
    ref,
    kind: 'agent',
    scope: '',
    key: `k${String(spanId)}`,
    status: 'ok',
    spanId,
    startedAt: stamp(from),
    endedAt: stamp(to),
    ...extra,
  }) as unknown as JournalEntry;

const wire = (
  seq: number,
  agentRef: number,
  ordinal: number,
  at: number,
  usage: Record<string, number>,
  extra: Record<string, unknown> = {},
): JournalEntry =>
  ({
    seq,
    kind: 'decision',
    scope: '',
    key: `pc:${String(agentRef)}:${String(ordinal)}`,
    status: 'ok',
    spanId: `w${String(seq)}`,
    startedAt: stamp(at),
    value: {
      decisionType: 'provider-call',
      agentRef,
      record: { ordinal, servedBy: 'fake:model', outcome: 'ok', usage, ...extra },
    },
  }) as unknown as JournalEntry;

const verdict = (seq: number, at: number, value: Record<string, unknown>): JournalEntry =>
  ({
    seq,
    kind: 'decision',
    scope: '',
    key: `finish-validation:${String(seq)}`,
    status: 'ok',
    spanId: `v${String(seq)}`,
    startedAt: stamp(at),
    endedAt: stamp(at),
    value: { decisionType: 'orchestrator_finish_validation', ...value },
  }) as unknown as JournalEntry;

const USE = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 };

/** The ninth comparison run's shape: two candidates, one repair. */
const repairShaped = (): JournalEntry[] => [
  running(109, 's819', 0),
  wire(110, 109, 1, 4_000, { ...USE, inputTokens: 200 }),
  wire(111, 109, 2, 150_000, USE),
  verdict(112, 160_000, {
    callId: 'C1',
    verdict: 'repair',
    failed: [{ name: 'evidence-grade', reasons: ['no run id in sentence'] }],
    repairsUsed: 0,
    maxRepairs: 2,
    candidateHash: 'h1',
    candidateChars: 42_335,
  }),
  wire(113, 109, 3, 175_000, USE),
  verdict(114, 177_000, { callId: 'C2', verdict: 'accepted', failed: [], repairsUsed: 1 }),
  terminal(115, 109, 's819', 0, 177_100, {
    costAttribution: { role: 'synthesize', label: 'final-composition' },
    providerCalls: [{ ordinal: 1 }, { ordinal: 2 }, { ordinal: 3 }],
  }),
];

describe('synthesisCandidatesFromJournal (RV2902)', () => {
  it('attributes each candidate its window, wires, usage, and priced cost', () => {
    const report = synthesisCandidatesFromJournal(repairShaped(), (servedBy, usage) =>
      servedBy === 'fake:model' ? usage.inputTokens / 1000 : undefined,
    );
    expect(report.synthesisSpans).toBe(1);
    expect(report.unhostedVerdicts).toBe(0);
    expect(report.unattributedSpans).toBe(0);
    expect(report.tailWires).toBe(0);
    expect(report.candidates).toHaveLength(2);
    const [first, second] = report.candidates;
    expect(first?.verdict).toBe('repair');
    expect(first?.callId).toBe('C1');
    expect(first?.failed).toEqual([{ name: 'evidence-grade', reasons: ['no run id in sentence'] }]);
    expect(first?.candidateHash).toBe('h1');
    expect(first?.spanLabel).toBe('final-composition');
    expect(first?.windowMs).toBe(160_000);
    expect(first?.wires).toBe(2);
    expect(first?.usage?.inputTokens).toBe(300);
    expect(first?.costUsd).toBeCloseTo(0.3, 12);
    // The repair candidate is the window between the two verdicts:
    // exactly its own wire, never the whole span.
    expect(second?.verdict).toBe('accepted');
    expect(second?.windowMs).toBe(17_000);
    expect(second?.wires).toBe(1);
    expect(second?.usage?.inputTokens).toBe(100);
    expect(second?.costUsd).toBeCloseTo(0.1, 12);
  });

  it('a journal without verdicts folds to NO candidates, not a zero candidate', () => {
    const report = synthesisCandidatesFromJournal([
      running(1, 's1', 0),
      wire(2, 1, 1, 100, USE),
      terminal(3, 1, 's1', 0, 200, {
        costAttribution: { role: 'synthesize' },
        providerCalls: [{ ordinal: 1 }],
      }),
    ]);
    expect(report.candidates).toEqual([]);
    expect(report.synthesisSpans).toBe(1);
    expect(report.unhostedVerdicts).toBe(0);
  });

  it('an unpriced wire drops costUsd instead of shrinking it (RV1209)', () => {
    const entries = repairShaped();
    const report = synthesisCandidatesFromJournal(entries, (servedBy, usage) =>
      usage.inputTokens > 150 ? undefined : usage.inputTokens / 1000,
    );
    const [first, second] = report.candidates;
    // The first window holds the unpriceable wire: usage stays, money
    // is absent, never a smaller number.
    expect(first?.usage?.inputTokens).toBe(300);
    expect('costUsd' in (first ?? {})).toBe(false);
    expect(second?.costUsd).toBeCloseTo(0.1, 12);
  });

  it('incomplete incremental rows keep verdict facts and drop the money', () => {
    // The rows append asynchronously by design: a span whose terminal
    // names three calls while the journal holds two rows cannot price
    // a window, only misprice it.
    const entries = repairShaped().filter((entry) => entry.seq !== 111);
    const report = synthesisCandidatesFromJournal(entries, () => 1);
    expect(report.unattributedSpans).toBe(1);
    expect(report.candidates).toHaveLength(2);
    const [first] = report.candidates;
    expect(first?.verdict).toBe('repair');
    expect(first?.failed[0]?.name).toBe('evidence-grade');
    expect('wires' in (first ?? {})).toBe(false);
    expect('usage' in (first ?? {})).toBe(false);
    expect('costUsd' in (first ?? {})).toBe(false);
    // The clock needs no wire rows: the window is still real.
    expect(first?.windowMs).toBe(160_000);
  });

  it('a verdict outside every settled synthesize span is counted, not guessed', () => {
    // Draft-stage validations live in the coordination span; a fold
    // that turned them into synthesis candidates would invent a
    // synthesis that never ran.
    const report = synthesisCandidatesFromJournal([
      running(1, 's1', 0),
      verdict(2, 50, { verdict: 'repair', failed: [] }),
      terminal(3, 1, 's1', 0, 100, { costAttribution: { role: 'orchestrate' } }),
      settleLike(4, 200),
    ]);
    expect(report.candidates).toEqual([]);
    expect(report.unhostedVerdicts).toBe(1);
    expect(report.synthesisSpans).toBe(0);
  });

  it('wires after the last verdict land in tailWires, attributed to nobody', () => {
    const entries = [
      running(1, 's1', 0),
      wire(2, 1, 1, 100, USE),
      verdict(3, 200, { verdict: 'accepted', failed: [] }),
      wire(4, 1, 2, 300, USE, { wireRequests: 2 }),
      terminal(5, 1, 's1', 0, 400, {
        costAttribution: { role: 'synthesize' },
        providerCalls: [{ ordinal: 1 }, { ordinal: 2 }],
      }),
    ];
    const report = synthesisCandidatesFromJournal(entries);
    expect(report.candidates).toHaveLength(1);
    expect(report.candidates[0]?.wires).toBe(1);
    expect(report.tailWires).toBe(2);
  });

  it('reads a REAL run: the repair cost is separable from the accepted pass', async () => {
    const journal = new InMemoryStore({ quiet: true });
    let orchTurn = 0;
    let synthTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'evidence' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return { toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'go' } } };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft: good enough' } } };
    });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => {
        synthTurn += 1;
        return {
          toolCall: {
            name: 'finish',
            args: { result: synthTurn === 1 ? 'first pass, bad' : 'second pass, good' },
          },
        };
      },
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
    const wf = makeOrchestratorWorkflow('produce a good result', {
      synthesis: {},
      finishValidation: {
        validators: [
          {
            name: 'must-say-good',
            validate: (input) =>
              input.text.includes('good') ? { ok: true } : { ok: false, reasons: ['say good'] },
          },
        ],
        maxRepairs: 1,
      },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'SC-RV2902' }).result;
    expect([outcome.status, outcome.error?.message]).toEqual(['ok', undefined]);
    const report = synthesisCandidatesFromJournal(await journal.load('SC-RV2902'), () => 0.01);
    expect(report.synthesisSpans).toBe(1);
    expect(report.unattributedSpans).toBe(0);
    const verdicts = report.candidates.map((candidate) => candidate.verdict);
    expect(verdicts).toEqual(['repair', 'accepted']);
    const [first, second] = report.candidates;
    expect(first?.failed[0]?.name).toBe('must-say-good');
    expect(first?.spanLabel).toBe(FINAL_COMPOSITION_LABEL);
    // Each candidate owns exactly its own wire, so the repair's cost is
    // separable: the question the ninth comparison run could not answer.
    expect(first?.wires).toBe(1);
    expect(second?.wires).toBe(1);
    expect(first?.costUsd).toBeCloseTo(0.01, 12);
    expect(second?.costUsd).toBeCloseTo(0.01, 12);
  });
});

const settleLike = (seq: number, at: number): JournalEntry =>
  ({
    seq,
    kind: 'decision',
    scope: '',
    status: 'ok',
    spanId: `d${String(seq)}`,
    startedAt: stamp(at),
    value: { decisionType: 'run_settle', runStatus: 'ok', segment: 1 },
  }) as unknown as JournalEntry;

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

describe('lastMechanicalRepairCostUsd (RV3802)', () => {
  const price = (servedBy: string, usage: { inputTokens: number }): number | undefined =>
    servedBy === 'fake:model' ? usage.inputTokens / 1000 : undefined;

  it('prices the window that followed a repair verdict inside the same span', () => {
    expect(lastMechanicalRepairCostUsd(repairShaped(), price)).toBeCloseTo(0.1, 12);
  });

  it('spanSeq names the hosting span so the pairing never crosses invocations', () => {
    const { candidates } = synthesisCandidatesFromJournal(repairShaped(), price);
    expect(candidates.map((candidate) => candidate.spanSeq)).toEqual([109, 109]);
  });

  it('returns undefined with no pairing, an unpriced window, or cross-span neighbors', () => {
    const clean = [
      running(1, 's1', 0),
      wire(2, 1, 1, 10, USE),
      verdict(3, 20, { callId: 'C1', verdict: 'accepted', failed: [], repairsUsed: 0 }),
      terminal(4, 1, 's1', 0, 30, {
        costAttribution: { role: 'synthesize' },
        providerCalls: [{ ordinal: 1 }],
      }),
    ];
    expect(lastMechanicalRepairCostUsd(clean, price)).toBeUndefined();
    expect(lastMechanicalRepairCostUsd(repairShaped(), () => undefined)).toBeUndefined();
    // A span that DIED on its repair verdict beside a fresh span that
    // opened with an acceptance: global neighbors, never a pairing.
    const cross = [
      running(1, 'sA', 0),
      wire(2, 1, 1, 10, USE),
      verdict(3, 20, {
        callId: 'A1',
        verdict: 'repair',
        failed: [{ name: 'provenance-anchor', reasons: ['no anchor'] }],
        repairsUsed: 0,
      }),
      terminal(4, 1, 'sA', 0, 30, {
        costAttribution: { role: 'synthesize' },
        providerCalls: [{ ordinal: 1 }],
      }),
      running(5, 'sB', 40),
      wire(6, 5, 1, 50, USE),
      verdict(7, 60, { callId: 'B1', verdict: 'accepted', failed: [], repairsUsed: 0 }),
      terminal(8, 5, 'sB', 40, 70, {
        costAttribution: { role: 'synthesize' },
        providerCalls: [{ ordinal: 1 }],
      }),
    ];
    expect(lastMechanicalRepairCostUsd(cross, price)).toBeUndefined();
  });
});
