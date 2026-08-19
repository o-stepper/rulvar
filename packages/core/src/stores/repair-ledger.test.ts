/**
 * The workflow-wide repair ledger (RV4002): the fifth comparison
 * experiment's run paid for exactly one repair (a coordination draft
 * rejected by three validators, healed by a sectional resubmission,
 * one more wire at $0.186) and no terminal aggregate could say so;
 * the independent judge rebuilt the count from the raw transcript.
 * This file pins the pure fold over synthetic journals and the live
 * envelope over real engine runs, including the parity the module
 * promises: the envelope aggregate and the post-hoc fold agree.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import type { ChatRequest, ModelRef, Usage } from '../l0/messages.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from '../engine/engine.js';
import { costReportFromJournal } from '../engine/cost-report.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from '../orchestrator/orchestrate.js';
import { repairLedgerFromJournal, type RepairLedger } from './repair-ledger.js';

const decision = (seq: number, scope: string, value: Record<string, unknown>): JournalEntry =>
  ({ seq, kind: 'decision', scope, key: `d${String(seq)}`, status: 'ok', value }) as JournalEntry;

const wireRow = (
  seq: number,
  scope: string,
  agentRef: number,
  record: Record<string, unknown>,
): JournalEntry => decision(seq, scope, { decisionType: 'provider-call', agentRef, record });

const usage: Usage = {
  inputTokens: 1000,
  outputTokens: 100,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

describe('repairLedgerFromJournal (RV4002)', () => {
  it('folds the fifth experiment shape: one draft rejection, sectional heal, priced wire', () => {
    const entries: JournalEntry[] = [
      decision(10, '', {
        decisionType: 'orchestrator_draft_gate',
        callId: 'c1',
        verdict: 'rejected',
        failed: [
          { name: 'contract-words', reasons: ['too short'] },
          { name: 'word-count', reasons: ['too short'] },
          { name: 'evidence-grade', reasons: ['no run id'] },
        ],
      }),
      wireRow(11, '', 5, { ordinal: 11, servedBy: 'fake:model', phase: 'repair', usage }),
      decision(12, '', {
        decisionType: 'orchestrator_draft_gate',
        callId: 'c2',
        verdict: 'accepted',
        spliced: true,
        sections: ['## Section 1', '## Section 6', '## Section 10'],
      }),
    ];
    const ledger = repairLedgerFromJournal(entries, () => 0.186);
    expect(ledger.draft).toBe(1);
    expect(ledger.composition).toBe(0);
    expect(ledger.semantic).toBe(0);
    expect(ledger.total).toBe(1);
    expect(ledger.unstagedVerdicts).toBe(0);
    expect(ledger.rounds).toHaveLength(1);
    const row = ledger.rounds[0];
    expect(row?.stage).toBe('draft');
    expect(row?.seq).toBe(10);
    expect(row?.callId).toBe('c1');
    expect(row?.failedValidators).toEqual(['contract-words', 'word-count', 'evidence-grade']);
    expect(row?.sections).toEqual(['## Section 1', '## Section 6', '## Section 10']);
    expect(row?.wireRef).toBe(11);
    expect(row?.costUsd).toBeCloseTo(0.186, 10);
  });

  it('buckets staged composition repairs, counts the dispatched round, and names unstaged verdicts', () => {
    const entries: JournalEntry[] = [
      decision(20, '', {
        decisionType: 'orchestrator_finish_validation',
        callId: 'f1',
        verdict: 'repair',
        stage: 'composition',
        failed: [{ name: 'word-count', reasons: ['short'] }],
        repairsUsed: 0,
        maxRepairs: 1,
      }),
      // The RV3307 round's own mechanical repair: stage 'round'.
      decision(30, '', {
        decisionType: 'orchestrator_finish_validation',
        callId: 'f2',
        verdict: 'repair',
        stage: 'round',
        failed: [{ name: 'evidence-grade', reasons: ['unanchored'] }],
        repairsUsed: 0,
        maxRepairs: 1,
      }),
      // A pre-RV4002 verdict: no stage, folds as unstaged, never guessed.
      decision(40, '', {
        decisionType: 'orchestrator_finish_validation',
        callId: 'f3',
        verdict: 'repair',
        failed: [],
        repairsUsed: 0,
        maxRepairs: 2,
      }),
      // The dispatched round itself: a settled final-composition span
      // whose invocation phase is 'repair' (RV3905).
      {
        seq: 50,
        ref: 25,
        kind: 'agent',
        scope: '',
        key: 'k1',
        status: 'ok',
        costAttribution: { label: 'final-composition', phase: 'repair', role: 'synthesize' },
      } as unknown as JournalEntry,
    ];
    const ledger = repairLedgerFromJournal(entries);
    expect(ledger.draft).toBe(0);
    expect(ledger.composition).toBe(2);
    expect(ledger.semantic).toBe(1);
    expect(ledger.total).toBe(3);
    expect(ledger.unstagedVerdicts).toBe(1);
    // The dispatched round owns a row since RV4105; this journal
    // predates the trigger stamp, so the row honestly carries none.
    expect(ledger.rounds.map((row) => row.stage)).toEqual(['composition', 'round', 'semantic']);
    expect(ledger.rounds[2]?.trigger).toBeUndefined();
  });

  it("a semantic round's wire lands on its own row, never on an earlier verdict whose billing has not landed (RV4105)", () => {
    const entries: JournalEntry[] = [
      decision(20, '', {
        decisionType: 'orchestrator_finish_validation',
        callId: 'f1',
        verdict: 'repair',
        stage: 'composition',
        failed: [{ name: 'word-count', reasons: ['short'] }],
      }),
      // The composition repair's own billing row never landed (the
      // RV2008 async posture allows it); before RV4105 the round's
      // wire below walked onto this row and its costUsd lied.
      {
        seq: 30,
        ref: 25,
        kind: 'agent',
        scope: '',
        key: 'k-round',
        status: 'ok',
        costAttribution: {
          label: 'final-composition',
          phase: 'repair',
          role: 'synthesize',
          repairTrigger: 'claim',
        },
      } as unknown as JournalEntry,
      wireRow(31, '', 25, { ordinal: 31, servedBy: 'fake:model', phase: 'repair', usage }),
    ];
    const ledger = repairLedgerFromJournal(entries, () => 0.2);
    expect(ledger.rounds.map((row) => row.stage)).toEqual(['composition', 'semantic']);
    const compositionRow = ledger.rounds[0];
    const semanticRow = ledger.rounds[1];
    expect(compositionRow?.wireRef).toBeUndefined();
    expect(compositionRow?.costUsd).toBeUndefined();
    expect(semanticRow?.trigger).toBe('claim');
    expect(semanticRow?.wireRef).toBe(31);
    expect(semanticRow?.costUsd).toBeCloseTo(0.2, 10);
  });

  it('the pairing window closes at the next row: a later wire stays unattached instead of misattached (RV4105)', () => {
    const entries: JournalEntry[] = [
      decision(20, '', {
        decisionType: 'orchestrator_finish_validation',
        callId: 'f1',
        verdict: 'repair',
        stage: 'composition',
        failed: [{ name: 'word-count', reasons: ['short'] }],
      }),
      decision(30, '', {
        decisionType: 'orchestrator_finish_validation',
        callId: 'f2',
        verdict: 'repair',
        stage: 'round',
        failed: [{ name: 'evidence-grade', reasons: ['unanchored'] }],
      }),
      wireRow(31, '', 25, { ordinal: 31, servedBy: 'fake:model', phase: 'repair', usage }),
      wireRow(32, '', 25, { ordinal: 32, servedBy: 'fake:model', phase: 'repair', usage }),
    ];
    const ledger = repairLedgerFromJournal(entries, () => 0.1);
    const first = ledger.rounds[0];
    const second = ledger.rounds[1];
    // The first wire claims its nearest row; the second wire's nearest
    // row is already claimed, and it must NOT walk past it onto the
    // older row whose own billing never landed.
    expect(second?.wireRef).toBe(31);
    expect(first?.wireRef).toBeUndefined();
    expect(first?.costUsd).toBeUndefined();
  });

  it('a clean journal folds to zeros with no rows', () => {
    const ledger = repairLedgerFromJournal([]);
    expect(ledger).toEqual({
      draft: 0,
      composition: 0,
      semantic: 0,
      total: 0,
      rounds: [],
      unstagedVerdicts: 0,
    });
  });
});

function priceVia(adapter: {
  caps(model: string): { pricing?: unknown };
}): (servedBy: ModelRef, usage: Usage) => number | undefined {
  // The adapter's own caps pricing, exactly the engine's table.
  return (servedBy, u) => {
    const model = servedBy.split(':')[1] ?? '';
    const pricing = adapter.caps(model).pricing as
      { inputUsdPerMTok: number; outputUsdPerMTok: number } | undefined;
    if (pricing === undefined) {
      return undefined;
    }
    return (
      (u.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
      (u.outputTokens / 1_000_000) * pricing.outputUsdPerMTok
    );
  };
}

describe('the live repair ledger on real runs (RV4002)', () => {
  it('a coordination-final mechanical repair lands in the envelope, the phase fold, and the journal', async () => {
    const validator = {
      name: 'needs-token',
      validate: (input: { text: string }): { ok: true } | { ok: false; reasons: string[] } =>
        input.text.includes('TOKEN') ? { ok: true } : { ok: false, reasons: ['missing TOKEN'] },
    };
    let orchTurn = 0;
    const adapter = scriptedAdapter((): ScriptedTurn => {
      orchTurn += 1;
      return orchTurn === 1
        ? { toolCall: { name: 'finish', args: { result: 'draft without the marker' } } }
        : { toolCall: { name: 'finish', args: { result: 'final document with TOKEN' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        // Deterministic receipts: the repair wire's incremental row is
        // durable before the envelope assembles, so wireRef always
        // attaches in this test.
        billingReceipts: 'awaited',
      },
    });
    const wf = makeOrchestratorWorkflow('audit', {
      acceptance: { childPolicy: 'all-ok' },
      finishValidation: { validators: [validator], maxRepairs: 1 },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'RL-COORD', budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    const repairs = (outcome.value as { repairs?: RepairLedger }).repairs;
    expect(repairs?.draft).toBe(0);
    expect(repairs?.composition).toBe(1);
    expect(repairs?.semantic).toBe(0);
    expect(repairs?.total).toBe(1);
    const row = repairs?.rounds[0];
    expect(row?.stage).toBe('composition');
    expect(row?.failedValidators).toEqual(['needs-token']);
    expect(row?.wireRef).toBeDefined();
    expect(row?.costUsd).toBeGreaterThan(0);

    const entries = await store.load('RL-COORD');
    // The verdicts carry their stage.
    const verdicts = entries
      .map((entry) => entry.value as { decisionType?: string; stage?: string } | undefined)
      .filter((value) => value?.decisionType === 'orchestrator_finish_validation');
    expect(verdicts.length).toBeGreaterThanOrEqual(2);
    expect(verdicts.every((value) => value?.stage === 'composition')).toBe(true);
    // The repair turn's wire record is stamped.
    const repairWires = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'provider-call' &&
        (entry.value as { record?: { phase?: string } }).record?.phase === 'repair',
    );
    expect(repairWires).toHaveLength(1);
    // Live and journal folds agree on the counts and the rows.
    const folded = repairLedgerFromJournal(entries, priceVia(adapter));
    expect(folded.total).toBe(repairs?.total);
    expect(folded.rounds.map((r) => [r.stage, r.seq])).toEqual(
      (repairs?.rounds ?? []).map((r) => [r.stage, r.seq]),
    );
    // The phase fold: the repair wire's money sits in the 'repair'
    // bucket on BOTH surfaces.
    expect(outcome.cost.byPhase.repair).toBeGreaterThan(0);
    const independent = costReportFromJournal(entries, priceVia(adapter));
    expect(independent.byPhase.repair).toBeCloseTo(outcome.cost.byPhase.repair ?? -1, 10);
  });

  it('a draft-gate rejection under a synthesis journals and counts as a draft repair', async () => {
    const validator = {
      name: 'needs-token',
      validate: (input: { text: string }): { ok: true } | { ok: false; reasons: string[] } =>
        input.text.includes('TOKEN') ? { ok: true } : { ok: false, reasons: ['missing TOKEN'] },
    };
    let orchTurn = 0;
    let synthTurn = 0;
    const adapter = scriptedAdapter((req: ChatRequest): ScriptedTurn => {
      const label = (req.providerOptions as { rulvar?: { label?: string } } | undefined)?.rulvar
        ?.label;
      if (label === 'final-composition') {
        synthTurn += 1;
        return { toolCall: { name: 'finish', args: { result: 'composed final with TOKEN' } } };
      }
      orchTurn += 1;
      return orchTurn === 1
        ? { toolCall: { name: 'finish', args: { result: 'draft without the marker' } } }
        : { toolCall: { name: 'finish', args: { result: 'repaired draft with TOKEN' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          extract: 'fake:model',
        },
        billingReceipts: 'awaited',
      },
    });
    const wf = makeOrchestratorWorkflow('audit', {
      acceptance: { childPolicy: 'all-ok' },
      synthesis: {},
      finishValidation: { validators: [validator], maxRepairs: 1, draftPolicy: 'contract' },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'RL-DRAFT', budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    expect(synthTurn).toBeGreaterThan(0);
    const repairs = (outcome.value as { repairs?: RepairLedger }).repairs;
    expect(repairs?.draft).toBe(1);
    expect(repairs?.composition).toBe(0);
    expect(repairs?.semantic).toBe(0);
    expect(repairs?.total).toBe(1);
    const row = repairs?.rounds[0];
    expect(row?.stage).toBe('draft');
    expect(row?.failedValidators).toEqual(['needs-token']);

    const entries = await store.load('RL-DRAFT');
    const draftGate = entries
      .map((entry) => entry.value as { decisionType?: string; verdict?: string } | undefined)
      .filter((value) => value?.decisionType === 'orchestrator_draft_gate');
    expect(draftGate.map((value) => value?.verdict)).toEqual(['rejected']);
  });

  it('a repair-free validated run carries the zero aggregate and no repair bucket', async () => {
    const validator = {
      name: 'anything',
      validate: (): { ok: true } => ({ ok: true }),
    };
    const adapter = scriptedAdapter((): ScriptedTurn => ({
      toolCall: { name: 'finish', args: { result: 'clean first try' } },
    }));
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' } },
    });
    const wf = makeOrchestratorWorkflow('audit', {
      acceptance: { childPolicy: 'all-ok' },
      finishValidation: { validators: [validator] },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'RL-CLEAN', budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    const repairs = (outcome.value as { repairs?: RepairLedger }).repairs;
    expect(repairs).toEqual({
      draft: 0,
      composition: 0,
      semantic: 0,
      total: 0,
      rounds: [],
      unstagedVerdicts: 0,
    });
    expect(outcome.cost.byPhase.repair).toBeUndefined();
    // An unconfigured run carries no aggregate at all.
    const bare = makeOrchestratorWorkflow('bare goal', {
      acceptance: { childPolicy: 'all-ok' },
    });
    let turn = 0;
    const bareAdapter = scriptedAdapter((): ScriptedTurn => {
      turn += 1;
      return { toolCall: { name: 'finish', args: { result: `bare ${String(turn)}` } } };
    });
    const bareEngine = createEngine({
      adapters: [bareAdapter],
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' } },
    });
    const bareOutcome = await bareEngine.run(bare, undefined, { runId: 'RL-BARE', budgetUsd: 5 })
      .result;
    expect((bareOutcome.value as { repairs?: unknown }).repairs).toBeUndefined();
  });
});
