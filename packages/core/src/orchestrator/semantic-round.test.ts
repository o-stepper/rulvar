/**
 * The shared bounded semantic round (RV4202, the sixth comparison
 * experiment). The experiment's run reached its strict-final gate with
 * a 'partial' grade and had exactly two doors, a typed refusal or the
 * standing waiver, because the round armed on findings alone; and
 * arming the claim and citation repairs TOGETHER was a ConfigError, so
 * a production posture could never repair both defect classes. These
 * tests pin the three new routes through the ONE bounded round: the
 * coverage arm (a non-'full' final grade dispatches the round carrying
 * the uncovered sentences), the merged round (both repairs armed fire
 * one round after the first audit pass, carrying both defect lists,
 * and both judges re-rule on the new hash), and the unchanged budget
 * (one extra composition, never two).
 */
import { describe, expect, it } from 'vitest';

import { FailRunError } from '../l0/errors.js';
import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { repairLedgerFromJournal } from '../stores/repair-ledger.js';
import { acceptanceTailRequiredUsd } from './admission.js';
import { pairDraftClaims } from './consistency.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'reads one span' } };
const POOL_READING = 'A failed audit write does not mask success (`src/exec.ts:256-296`).';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
      }
    }
  }
  return handles;
}

function textOf(req: ChatRequest): string {
  return req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

describe('the fold reports the uncovered citing sentences (RV4202)', () => {
  it('collects the distinct uncovered sentences in draft order, capped and cut', () => {
    const fold = pairDraftClaims(
      'Covered claim about the epilogue [src/exec.ts:260]. ' +
        'Uncovered claim about the ladder [src/retry.ts:24]. ' +
        'Uncovered claim about the ladder [src/retry.ts:24]. ' +
        'Another uncovered one [src/quota.ts:9].',
      [{ nodeId: 'a', text: POOL_READING }],
      { reportUncovered: true },
    );
    expect(fold.uncoveredSentences).toEqual([
      'Uncovered claim about the ladder [src/retry.ts:24].',
      'Another uncovered one [src/quota.ts:9].',
    ]);
    expect(fold.uncoveredSentencesTotal).toBe(2);
  });

  it('stays absent without the flag: the fold output keeps its bytes', () => {
    const fold = pairDraftClaims('One claim [src/retry.ts:24].', [
      { nodeId: 'a', text: POOL_READING },
    ]);
    expect('uncoveredSentences' in fold).toBe(false);
    expect('uncoveredSentencesTotal' in fold).toBe(false);
  });
});

describe('coverageRepair intake (RV4202)', () => {
  it("requires onFound 'repair' and coveragePolicy 'strict-final', and a boolean", () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        claimConsistency: { stage: 'final', coverageRepair: true },
      }),
    ).toThrow(/coverageRepair requires onFound 'repair'/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        claimConsistency: { stage: 'final', onFound: 'repair', coverageRepair: true },
      }),
    ).toThrow(/coverageRepair requires coveragePolicy 'strict-final'/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        claimConsistency: {
          stage: 'final',
          onFound: 'repair',
          coveragePolicy: 'strict-final',
          coverageRepair: 'yes' as unknown as boolean,
        },
      }),
    ).toThrow(/coverageRepair must be a boolean/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        claimConsistency: {
          stage: 'final',
          onFound: 'repair',
          coveragePolicy: 'strict-final',
          coverageRepair: true,
        },
      }),
    ).not.toThrow();
  });
});

// Two citing sentences; the pool grounds only the exec one, so the
// first final grades 'partial' with the retry sentence uncovered.
const FINAL_PARTIAL =
  'final: an audit-write failure does not mask success [src/exec.ts:260]. ' +
  'final: the retry ladder caps at three attempts [src/retry.ts:24].';
const FINAL_COVERED = 'final: an audit-write failure does not mask success [src/exec.ts:260].';
// The inverted variant: the claim judge finds a contradiction AND the
// retry sentence stays uncovered, so the round carries both classes.
const FINAL_PARTIAL_INVERTED =
  'final: an audit-write failure does not turn success into failure [src/exec.ts:260]. ' +
  'final: the retry ladder caps at three attempts [src/retry.ts:24].';

const JUDGE_FINDS: ScriptedTurn = {
  text: JSON.stringify({
    contradictions: [{ pair: 0, reason: 'the draft inverts the recorded reading' }],
  }),
};
const JUDGE_AGREES: ScriptedTurn = { text: JSON.stringify({ contradictions: [] }) };

/** Spawns one worker, awaits it, finishes with a plain draft. */
function coverageHarness(options: { judgeTurns: ScriptedTurn[]; finals: string[] }) {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: POOL_READING };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read the span' } },
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft before synthesis' } } };
  });
  let judgeCall = 0;
  const judge = scriptedAdapter(
    (): ScriptedTurn => options.judgeTurns[Math.min(judgeCall++, options.judgeTurns.length - 1)],
    { id: 'judge' },
  );
  let synthCall = 0;
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({
      toolCall: {
        name: 'finish',
        args: { result: options.finals[Math.min(synthCall++, options.finals.length - 1)] },
      },
    }),
    { id: 'strong' },
  );
  const { internals } = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { internals, judge, synthesis };
}

const COVERAGE_OPTS = {
  acceptance: { childPolicy: 'all-ok' as const },
  synthesis: { limits: { maxTurns: 3 } },
  claimConsistency: {
    stage: 'final' as const,
    onFound: 'repair' as const,
    coveragePolicy: 'strict-final' as const,
    coverageRepair: true,
    judge: { model: 'judge:model' as const },
  },
};

describe('the coverage-armed round (RV4202)', () => {
  it("a 'partial' final grade dispatches the round carrying the uncovered sentences, and the re-graded 'full' settles", async () => {
    const { internals, synthesis } = coverageHarness({
      judgeTurns: [JUDGE_AGREES, JUDGE_AGREES],
      finals: [FINAL_PARTIAL, FINAL_COVERED],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', COVERAGE_OPTS),
      undefined,
    )) as {
      result: unknown;
      claimConsistencyMeta?: Record<string, unknown>;
      claimCoverageWaiver?: unknown;
      draftToFinal?: { finalHash: string };
    };
    expect(synthesis.calls).toHaveLength(2);
    // The round's prompt carries the uncovered sentences and no
    // contradiction block: nothing was contradicted, coverage alone
    // armed it.
    expect(textOf(synthesis.calls[0])).not.toContain('UNCOVERED CLAIMS');
    expect(textOf(synthesis.calls[1])).toContain('UNCOVERED CLAIMS');
    expect(textOf(synthesis.calls[1])).toContain('the retry ladder caps at three attempts');
    expect(textOf(synthesis.calls[1])).not.toContain('CLAIM CONTRADICTIONS');
    expect(outcome.result).toBe(FINAL_COVERED);
    expect(outcome.claimConsistencyMeta?.coverage).toBe('full');
    expect(outcome.claimConsistencyMeta?.passes).toBe(2);
    expect(outcome.claimConsistencyMeta?.firstPassFindings).toBe(0);
    expect(outcome.claimConsistencyMeta?.firstPassCoverage).toBe('partial');
    expect(outcome.claimConsistencyMeta?.semanticRepairRounds).toBe(1);
    expect(outcome.claimConsistencyMeta?.judgedHash).toBe(outcome.draftToFinal?.finalHash);
    expect('claimCoverageWaiver' in outcome).toBe(false);
    // The dispatched round is stamped 'coverage' (RV4105 channel), and
    // the repair ledger folds it into its own semantic row.
    const roundEntry = internals.replayer
      .snapshot()
      .find(
        (entry) =>
          entry.kind === 'agent' &&
          entry.costAttribution?.label === 'final-composition' &&
          entry.costAttribution.phase === 'repair',
      );
    expect(roundEntry?.costAttribution?.repairTrigger).toBe('coverage');
    const ledger = repairLedgerFromJournal(internals.replayer.snapshot());
    expect(ledger.semantic).toBe(1);
    expect(ledger.rounds.find((row) => row.stage === 'semantic')?.trigger).toBe('coverage');
  });

  it("a grade that is STILL not 'full' after the round refuses typed, naming the spent round", async () => {
    const { internals, synthesis } = coverageHarness({
      judgeTurns: [JUDGE_AGREES, JUDGE_AGREES],
      finals: [FINAL_PARTIAL, FINAL_PARTIAL],
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', COVERAGE_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.coverage).toBe('partial');
    expect(data.repairsUsed).toBe(1);
    expect(data.roundTrigger).toBe('coverage');
    expect(typeof data.preRepairHash).toBe('string');
    expect(synthesis.calls).toHaveLength(2);
  });

  it("findings plus a 'partial' grade arm ONE round carrying both classes, trigger 'combined'", async () => {
    const { internals, synthesis, judge } = coverageHarness({
      judgeTurns: [JUDGE_FINDS, JUDGE_AGREES],
      finals: [FINAL_PARTIAL_INVERTED, FINAL_COVERED],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', COVERAGE_OPTS),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    expect(synthesis.calls).toHaveLength(2);
    expect(judge.calls).toHaveLength(2);
    expect(textOf(synthesis.calls[1])).toContain('CLAIM CONTRADICTIONS');
    expect(textOf(synthesis.calls[1])).toContain('UNCOVERED CLAIMS');
    expect(outcome.claimConsistencyMeta?.passes).toBe(2);
    expect(outcome.claimConsistencyMeta?.firstPassFindings).toBe(1);
    expect(outcome.claimConsistencyMeta?.firstPassCoverage).toBe('partial');
    const roundEntry = internals.replayer
      .snapshot()
      .find(
        (entry) =>
          entry.kind === 'agent' &&
          entry.costAttribution?.label === 'final-composition' &&
          entry.costAttribution.phase === 'repair',
      );
    expect(roundEntry?.costAttribution?.repairTrigger).toBe('combined');
  });

  it('a clean full first pass never dispatches the round: bytes and wires unchanged', async () => {
    const { internals, synthesis } = coverageHarness({
      judgeTurns: [JUDGE_AGREES],
      finals: [FINAL_COVERED],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', COVERAGE_OPTS),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    expect(synthesis.calls).toHaveLength(1);
    expect(outcome.claimConsistencyMeta?.passes).toBe(1);
    expect(outcome.claimConsistencyMeta?.semanticRepairRounds).toBe(0);
    expect('firstPassCoverage' in (outcome.claimConsistencyMeta ?? {})).toBe(false);
  });
});

// ---- The merged round: both repairs armed grant the SAME one round.

const MERGED_SNAPSHOT: Record<string, string> = {
  'src/exec.ts:260': 'if (!auditWrite.ok) { keepSuccess(); }',
  'src/otel.ts:18': 'attributes: dropUnknown(config.exporter),',
};
const resolveMerged = (target: { path: string; line: number }): string | undefined =>
  MERGED_SNAPSHOT[`${target.path}:${String(target.line)}`];

const MERGED_BAD = [
  '# Audit',
  '',
  '## Exec',
  '',
  'final: an audit-write failure does not turn success into failure [src/exec.ts:260].',
  '',
  '## Otel',
  '',
  'No SLO observations exist anywhere in the exporter [src/otel.ts:18].',
].join('\n');

const MERGED_FIXED = [
  '# Audit',
  '',
  '## Exec',
  '',
  'final: a failed audit write keeps success intact [src/exec.ts:260].',
  '',
  '## Otel',
  '',
  'The exporter drops unknown attributes before batching [src/otel.ts:18].',
].join('\n');

const CITE_BAD: ScriptedTurn = {
  text: JSON.stringify({
    verdicts: [
      { row: 0, verdict: 'unsupported', reason: 'attribute policy, not observation absence' },
      { row: 1, verdict: 'supported', reason: 'the line preserves success' },
    ],
  }),
};
const CITE_CLEAN: ScriptedTurn = {
  text: JSON.stringify({
    verdicts: [
      { row: 0, verdict: 'supported', reason: 'now claims the policy itself' },
      { row: 1, verdict: 'supported', reason: 'the line preserves success' },
    ],
  }),
};

/**
 * One judge adapter serves both judges, split by the prompt's own
 * opening line; the finals script the composition and the round.
 */
function mergedHarness(options: {
  claimTurns: ScriptedTurn[];
  citationTurns: ScriptedTurn[];
  finals: string[];
}) {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: POOL_READING };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read the span' } },
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft before synthesis' } } };
  });
  let claimCall = 0;
  let citationCall = 0;
  const judge = scriptedAdapter(
    (req): ScriptedTurn => {
      if (textOf(req).includes('claim-consistency judge')) {
        return options.claimTurns[Math.min(claimCall++, options.claimTurns.length - 1)];
      }
      return options.citationTurns[Math.min(citationCall++, options.citationTurns.length - 1)];
    },
    { id: 'judge' },
  );
  let synthCall = 0;
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({
      toolCall: {
        name: 'finish',
        args: { result: options.finals[Math.min(synthCall++, options.finals.length - 1)] },
      },
    }),
    { id: 'strong' },
  );
  const { internals } = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return {
    internals,
    synthesis,
    claimCalls: () => claimCall,
    citationCalls: () => citationCall,
  };
}

const MERGED_OPTS = {
  acceptance: { childPolicy: 'all-ok' as const },
  synthesis: { limits: { maxTurns: 3 } },
  claimConsistency: {
    stage: 'final' as const,
    onFound: 'repair' as const,
    judge: { model: 'judge:model' as const },
  },
  citationAudit: {
    resolve: resolveMerged,
    onFound: 'repair' as const,
    judge: { model: 'judge:model' as const },
  },
};

describe('the merged round (RV4202): both repairs armed grant the same one round', () => {
  it('one composition consumes both defect lists, both judges re-rule on the new hash, the run settles', async () => {
    const rig = mergedHarness({
      claimTurns: [JUDGE_FINDS, JUDGE_AGREES],
      citationTurns: [CITE_BAD, CITE_CLEAN],
      finals: [MERGED_BAD, MERGED_FIXED],
    });
    const outcome = (await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', MERGED_OPTS),
      undefined,
    )) as {
      result: unknown;
      claimConsistencyMeta?: Record<string, unknown>;
      citationAuditMeta?: Record<string, unknown>;
      draftToFinal?: { finalHash: string };
    };
    // ONE extra composition, exactly: the merged round, never two.
    expect(rig.synthesis.calls).toHaveLength(2);
    expect(rig.claimCalls()).toBe(2);
    expect(rig.citationCalls()).toBe(2);
    // The round's prompt carries BOTH defect lists.
    const roundPrompt = textOf(rig.synthesis.calls[1]);
    expect(roundPrompt).toContain('CLAIM CONTRADICTIONS');
    expect(roundPrompt).toContain('CITATION AUDIT FINDINGS');
    expect(outcome.result).toBe(MERGED_FIXED);
    // Both terminal verdicts describe the SHIPPED document.
    expect(outcome.claimConsistencyMeta?.judgedHash).toBe(outcome.draftToFinal?.finalHash);
    expect(outcome.citationAuditMeta?.auditedHash).toBe(outcome.draftToFinal?.finalHash);
    expect(outcome.claimConsistencyMeta).toMatchObject({
      passes: 2,
      firstPassFindings: 1,
      semanticRepairRounds: 1,
      findings: 0,
    });
    expect(outcome.citationAuditMeta).toMatchObject({
      passes: 2,
      firstPassFindings: 1,
      citationRepairRounds: 1,
      unsupported: 0,
    });
    // The one round's row says who dispatched it: both classes.
    const ledger = repairLedgerFromJournal(rig.internals.replayer.snapshot());
    expect(ledger.semantic).toBe(1);
    expect(ledger.rounds.find((row) => row.stage === 'semantic')?.trigger).toBe('combined');
  });

  it('unsupported citations that survive the merged round fail the run typed', async () => {
    const rig = mergedHarness({
      claimTurns: [JUDGE_FINDS, JUDGE_AGREES],
      citationTurns: [CITE_BAD, CITE_BAD],
      finals: [MERGED_BAD, MERGED_BAD],
    });
    const thrown = await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', MERGED_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_citation_audit');
    expect(data.repairsUsed).toBe(1);
    expect(rig.synthesis.calls).toHaveLength(2);
  });

  it('contradictions that survive the merged round fail the run typed, claim source first', async () => {
    const rig = mergedHarness({
      claimTurns: [JUDGE_FINDS, JUDGE_FINDS],
      citationTurns: [CITE_BAD, CITE_CLEAN],
      finals: [MERGED_BAD, MERGED_BAD],
    });
    const thrown = await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', MERGED_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.repairsUsed).toBe(1);
  });

  it('a clean pair of first passes dispatches nothing: one composition, passes 1 on both metas', async () => {
    const rig = mergedHarness({
      claimTurns: [JUDGE_AGREES],
      citationTurns: [CITE_CLEAN],
      finals: [MERGED_FIXED],
    });
    const outcome = (await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', MERGED_OPTS),
      undefined,
    )) as {
      claimConsistencyMeta?: Record<string, unknown>;
      citationAuditMeta?: Record<string, unknown>;
    };
    expect(rig.synthesis.calls).toHaveLength(1);
    expect(outcome.claimConsistencyMeta).toMatchObject({ passes: 1, semanticRepairRounds: 0 });
    expect(outcome.citationAuditMeta).toMatchObject({ passes: 1, citationRepairRounds: 0 });
  });
});

describe('the acceptance tail prices the merged round once (RV4202)', () => {
  it('both repairs armed: one round composition, two passes per judge, never a third claim pass', () => {
    const merged = acceptanceTailRequiredUsd({
      claimStage: 'final',
      claimOnFound: 'repair',
      claimConfigured: true,
      claimJudgeEstCostUsd: 0.2,
      citationOnFound: 'repair',
      citationJudgeEstCostUsd: 0.25,
      synthesisEstCostUsd: 0.3,
      workingRoomUsd: 0,
    });
    expect(merged.terms.judgePasses).toBe(2);
    expect(merged.terms.citationJudgePasses).toBe(2);
    expect(merged.terms.roundCompositionUsd).toBeCloseTo(0.3, 10);
    // claim 0.2 x 2 + citation 0.25 x 2 + one composition 0.3.
    expect(merged.requiredUsd).toBeCloseTo(0.4 + 0.5 + 0.3, 10);
  });
});
