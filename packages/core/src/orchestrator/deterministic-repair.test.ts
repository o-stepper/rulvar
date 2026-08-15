/**
 * The deterministic provenance patch in the finish loop (RV3801, the
 * third comparison run). The run died twice on a failure class whose
 * remedy the evidence-grade verdict prescribes word for word: the
 * initial composition spent the mechanical pool on it, and the repair
 * round's candidate hit it again with nothing left. When every failure
 * of a string candidate carries structured repair hints, the loop now
 * performs the prescription itself (no provider wire, no repair
 * spent), re-judges the patched document with the FULL validator set,
 * and journals the patch as part of the verdict; everything short of
 * that falls through to the ordinary model repair pool unchanged.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';

import {
  evidenceGradeValidator,
  minMatchesValidator,
  wordCountValidator,
} from './finish-validators.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const UNGROUNDED = 'The masking path is production-proven in the field.';
const PATCHED = 'The masking path is production-proven in the field (run test-run).';

interface VerdictRow {
  verdict?: string;
  repairsUsed?: number;
  failed?: { name?: string }[];
  candidateHash?: string;
  deterministicRepair?: {
    mechanism?: string;
    patches?: { start?: number; end?: number; insert?: string }[];
    beforeHash?: string;
    afterHash?: string;
    outcome?: string;
    healed?: { name?: string }[];
    residual?: string[];
  };
}

function verdictRows(entries: readonly { kind: string; value?: unknown }[]): VerdictRow[] {
  return entries
    .filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation',
    )
    .map((entry) => entry.value as VerdictRow);
}

/** One coordination loop that finishes with `finals` in call order. */
function finishHarness(finals: readonly unknown[]) {
  let turn = 0;
  const loop = scriptedAdapter((): ScriptedTurn => ({
    toolCall: {
      name: 'finish',
      args: { result: finals[Math.min(turn++, finals.length - 1)] },
    },
  }));
  const { internals, store } = makeInternals({
    adapters: [loop],
    routing: { loop: 'fake:model', orchestrate: 'fake:model' },
  });
  return { internals, store, loop };
}

describe('the deterministic provenance patch (RV3801)', () => {
  it('heals the candidate host side with the pool EXHAUSTED, the third comparison class', async () => {
    // maxRepairs 0 is the sharpest form of the run's death: without
    // the patch the first rejected finish fails the run; with it the
    // verdict is accepted, no wire is spent, and the accepted result
    // is the patched bytes.
    const { internals, store, loop } = finishHarness([UNGROUNDED]);
    // Without an acceptance policy the workflow output IS the bare
    // finish result, so the patched bytes ride it directly.
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the masking path', {
        finishValidation: { validators: [evidenceGradeValidator()], maxRepairs: 0 },
      }),
      undefined,
    );
    expect(outcome).toBe(PATCHED);
    expect(loop.calls).toHaveLength(1);
    const rows = verdictRows(await store.load('test-run'));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.verdict).toBe('accepted');
    expect(row?.repairsUsed).toBe(0);
    // Accepted means clean for every consumer: the healed failures
    // ride the patch record, never `failed`, and no candidate
    // identity is written because nothing was rejected.
    expect(row?.failed).toEqual([]);
    expect(row?.candidateHash).toBeUndefined();
    const patch = row?.deterministicRepair;
    expect(patch?.mechanism).toBe('insert-run-id');
    expect(patch?.outcome).toBe('accepted');
    expect(patch?.patches).toHaveLength(1);
    expect(patch?.patches?.[0]?.insert).toBe('test-run');
    expect(typeof patch?.beforeHash).toBe('string');
    expect(typeof patch?.afterHash).toBe('string');
    expect(patch?.beforeHash).not.toBe(patch?.afterHash);
    expect(patch?.healed?.map((failure) => failure.name)).toEqual(['evidence-grade']);
    expect(patch?.residual).toBeUndefined();
  });

  it('falls back to the model pool when a sibling rejects the patched document', async () => {
    // The original candidate passes word-count exactly; the patch adds
    // two words and trips it, so the attempt is recorded as failed and
    // the ordinary repair turn proceeds with the ORIGINAL verdict.
    const repaired = 'Path is production-proven per run test-run.';
    const { internals, store, loop } = finishHarness([UNGROUNDED, repaired]);
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the masking path', {
        finishValidation: {
          validators: [evidenceGradeValidator(), wordCountValidator({ max: 8 })],
          maxRepairs: 1,
        },
      }),
      undefined,
    );
    expect(outcome).toBe(repaired);
    expect(loop.calls).toHaveLength(2);
    const rows = verdictRows(await store.load('test-run'));
    expect(rows.map((row) => row.verdict)).toEqual(['repair', 'accepted']);
    const attempt = rows[0]?.deterministicRepair;
    expect(attempt?.outcome).toBe('failed');
    expect(attempt?.residual).toEqual(['word-count']);
    expect(attempt?.healed).toBeUndefined();
    // The failed attempt costs nothing and hides nothing: the decision
    // reads exactly as it would without one.
    expect(rows[0]?.failed?.map((failure) => failure.name)).toEqual(['evidence-grade']);
    expect(typeof rows[0]?.candidateHash).toBe('string');
  });

  it('attempts nothing under partial hint coverage: a hintless failure means a model repair', async () => {
    const grounded = 'Path is production-proven per run test-run, see src/exec.ts:14.';
    const { internals, store, loop } = finishHarness([UNGROUNDED, grounded]);
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the masking path', {
        finishValidation: {
          validators: [
            evidenceGradeValidator(),
            minMatchesValidator({
              pattern: 'src/[a-z]+\\.ts:\\d+',
              min: 1,
              name: 'provenance-anchor',
            }),
          ],
          maxRepairs: 1,
        },
      }),
      undefined,
    );
    expect(outcome).toBe(grounded);
    expect(loop.calls).toHaveLength(2);
    const rows = verdictRows(await store.load('test-run'));
    expect(rows.map((row) => row.verdict)).toEqual(['repair', 'accepted']);
    expect(rows[0]?.deterministicRepair).toBeUndefined();
  });

  it('never patches a non-string candidate, whatever the hints say', async () => {
    const { internals, store, loop } = finishHarness([
      { note: 'the masking path is production-proven in the field' },
      PATCHED,
    ]);
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the masking path', {
        finishValidation: { validators: [evidenceGradeValidator()], maxRepairs: 1 },
      }),
      undefined,
    );
    expect(outcome).toBe(PATCHED);
    expect(loop.calls).toHaveLength(2);
    const rows = verdictRows(await store.load('test-run'));
    expect(rows.map((row) => row.verdict)).toEqual(['repair', 'accepted']);
    expect(rows[0]?.deterministicRepair).toBeUndefined();
  });
});

describe('the patch composes with the claim round (RV3801)', () => {
  const POOL_READING = 'A failed audit write does not mask success (`src/exec.ts:256-296`).';
  const DRAFT =
    'draft: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';
  // The adversarial shape: a POSITIVE production claim that inverts
  // the pool reading, anchored so it pairs, graded so it needs
  // provenance. Under an artifact pattern accepting only run ids the
  // citation does not license the grade, the patch inserts the id,
  // and the judge then rules on exactly the patched sentence.
  const FINAL_UNGROUNDED_INVERTED =
    'final: an audit-write failure does not turn success into failure and the fix is ' +
    'production-proven [src/exec.ts:256-296].';
  const FINAL_PATCHED =
    'final: an audit-write failure does not turn success into failure and the fix is ' +
    'production-proven [src/exec.ts:256-296] (run test-run).';
  const FINAL_CLEAN = 'final: a failed audit write does not mask success [src/exec.ts:256-296].';
  const RUN_ID_ONLY_ARTIFACT = 'run[ -]?[0-9A-HJKMNP-TV-Z]{6,26}';

  function agentTypeOf(req: ChatRequest): string {
    const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
    return rulvar?.agentType ?? '';
  }

  function handlesIn(req: ChatRequest): number[] {
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
  }

  function textOf(req: ChatRequest): string {
    return req.messages
      .flatMap((msg) => msg.parts)
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
  }

  it('a healed failure still teaches the round, and the judge rules on the patched bytes', async () => {
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: POOL_READING };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read it' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: DRAFT } } };
    });
    const judgeTurns: ScriptedTurn[] = [
      {
        text: JSON.stringify({
          contradictions: [{ pair: 0, reason: 'the draft inverts the recorded reading' }],
        }),
      },
      { text: JSON.stringify({ contradictions: [] }) },
    ];
    let judgeCall = 0;
    const judge = scriptedAdapter(
      (): ScriptedTurn => judgeTurns[Math.min(judgeCall++, judgeTurns.length - 1)] ?? judgeTurns[0],
      { id: 'judge' },
    );
    const finals = [FINAL_UNGROUNDED_INVERTED, FINAL_CLEAN];
    let synthCall = 0;
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: {
          name: 'finish',
          args: { result: finals[Math.min(synthCall++, finals.length - 1)] },
        },
      }),
      { id: 'strong' },
    );
    const { internals, store } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: { worker: { description: 'reads one span' } },
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: {
          stage: 'final',
          onFound: 'repair',
          judge: { model: 'judge:model' },
        },
        finishValidation: {
          validators: [evidenceGradeValidator({ artifactPattern: RUN_ID_ONLY_ARTIFACT })],
          maxRepairs: 1,
        },
      }),
      undefined,
    )) as {
      result?: unknown;
      claimConsistencyMeta?: { judgedStage?: unknown; findings?: unknown; judgedHash?: unknown };
      draftToFinal?: { finalHash?: unknown };
    };
    // The round consumed the finding over the PATCHED document and the
    // clean composition shipped: two compositions, two judge passes,
    // zero mechanical repair turns anywhere.
    expect(outcome.result).toBe(FINAL_CLEAN);
    expect(outcome.claimConsistencyMeta?.findings).toBe(0);
    expect(synthesis.calls).toHaveLength(2);
    expect(judge.calls).toHaveLength(2);
    const rows = verdictRows(await store.load('test-run'));
    expect(rows.map((row) => row.verdict)).toEqual(['accepted', 'accepted']);
    expect(rows.map((row) => row.repairsUsed)).toEqual([0, 0]);
    expect(rows[0]?.deterministicRepair?.outcome).toBe('accepted');
    expect(rows[1]?.deterministicRepair).toBeUndefined();
    // The judge's first pass ruled on the patched bytes, never the
    // submitted ones: the pass carries the accepted document, id and
    // all, so a deterministic insertion can satisfy provenance
    // mechanics but never mask a false claim from the judge.
    expect(textOf(judge.calls[0] ?? ({ messages: [] } as unknown as ChatRequest))).toContain(
      'production-proven [src/exec.ts:256-296] (run test-run)',
    );
    expect(FINAL_PATCHED.endsWith('(run test-run).')).toBe(true);
    // A healed failure is still a bought lesson (RV3801 on RV3603):
    // the round's fresh invocation reads it even though the host, not
    // a model turn, performed the repair.
    const roundPrompt = textOf(synthesis.calls[1] ?? ({ messages: [] } as unknown as ChatRequest));
    expect(roundPrompt).toContain('CLAIM CONTRADICTIONS');
    expect(roundPrompt).toContain('HOST VALIDATION LESSONS');
    expect(roundPrompt).toContain('evidence-grade');
  });
});
