/**
 * The parallel judge pair and the digest draft (RV4210, the sixth
 * comparison experiment). The run under audit spent 100.8 seconds of
 * its tail waiting for the claim judge before the citation judge could
 * start, on two verdicts over the SAME immutable document that read
 * nothing of each other; and its harness forced a full contract-valid
 * prose draft (344.8 s) that the composition then rewrote whole,
 * because the only draft policies priced the draft for a skip gate the
 * config never used. These tests pin the unarmed pair dispatching
 * concurrently with the verdicts processed in the historical order,
 * the armed rounds keeping the strict sequence, the wire counts not
 * growing, and the digest policy's whole contract.
 */
import { describe, expect, it } from 'vitest';

import { FailRunError } from '../l0/errors.js';
import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'reads one span' } };

const textOf = (req: ChatRequest): string =>
  req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

const agentTypeOf = (req: ChatRequest): string =>
  (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ?? '';

const handlesIn = (req: ChatRequest): number[] => {
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
};

const ACCEPT_ALL = [{ name: 'accept-all', validate: (): { ok: true } => ({ ok: true }) }];

const CLEAN_FINAL = 'final: an audit-write failure does not mask success [src/exec.ts:260].';

function judgesHarness(options: {
  claimHangMs: number;
  claimVerdict?: ScriptedTurn;
  finals?: string[];
}) {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'A failed audit write does not mask success (`src/exec.ts:256-296`).' };
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
  const judgeCallsAt: Array<{ kind: 'claim' | 'citation'; at: number }> = [];
  const judge = scriptedAdapter(
    (req): ScriptedTurn => {
      if (textOf(req).includes('You audit CITATIONS')) {
        judgeCallsAt.push({ kind: 'citation', at: Date.now() });
        const verdicts: { row: number; verdict: string; reason: string }[] = [];
        for (const match of textOf(req).matchAll(/"row":(\d+)/gu)) {
          verdicts.push({ row: Number(match[1]), verdict: 'supported', reason: 'entails' });
        }
        return { text: JSON.stringify({ verdicts }) };
      }
      judgeCallsAt.push({ kind: 'claim', at: Date.now() });
      return {
        hangMs: options.claimHangMs,
        ...(options.claimVerdict ?? { text: JSON.stringify({ contradictions: [] }) }),
      };
    },
    { id: 'judge' },
  );
  let synthCall = 0;
  const finals = options.finals ?? [CLEAN_FINAL];
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({
      toolCall: {
        name: 'finish',
        args: { result: finals[Math.min(synthCall++, finals.length - 1)] },
      },
    }),
    { id: 'strong' },
  );
  const made = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { ...made, judge, judgeCallsAt };
}

const AUDIT = {
  resolve: (): string => 'the cited line, verbatim',
  judge: { model: 'judge:model' as const },
};

describe('the unarmed judge pair dispatches in parallel (RV4210)', () => {
  it('the citation judge starts while the claim judge hangs; verdicts keep their order', async () => {
    const { internals, judgeCallsAt } = judgesHarness({ claimHangMs: 300 });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'final', judge: { model: 'judge:model' } },
        citationAudit: AUDIT,
      }),
      undefined,
    )) as Record<string, unknown>;
    const verdict = outcome.semanticTerminalVerdict as Record<string, unknown>;
    expect(verdict.verdict).toBe('clean');
    // Both judge REQUESTS hit the wire together: the citation call
    // lands while the claim response still hangs (300 ms), so the gap
    // between the two dispatches is a scheduling tick, not a judge
    // wall. The sequential path would separate them by the full hang.
    expect(judgeCallsAt.map((call) => call.kind).sort()).toEqual(['citation', 'claim']);
    const [first, second] = judgeCallsAt;
    expect(Math.abs((second?.at ?? 0) - (first?.at ?? 0))).toBeLessThan(150);
  });

  it('an armed citation round keeps the strict sequence: the audit reads what ships', async () => {
    const { internals, judgeCallsAt } = judgesHarness({ claimHangMs: 300 });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'final', judge: { model: 'judge:model' } },
        citationAudit: { ...AUDIT, onFound: 'repair' },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect((outcome.semanticTerminalVerdict as Record<string, unknown>).verdict).toBe('clean');
    // The claim judge settles (hang included) BEFORE the audit
    // dispatches: the round could rewrite the document, and the audit
    // must read what ships.
    const claim = judgeCallsAt.find((call) => call.kind === 'claim');
    const citation = judgeCallsAt.find((call) => call.kind === 'citation');
    expect((citation?.at ?? 0) - (claim?.at ?? 0)).toBeGreaterThanOrEqual(280);
  });

  it('wire counts do not grow: two judge dispatches, one composition', async () => {
    const { internals, judge } = judgesHarness({ claimHangMs: 0 });
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'final', judge: { model: 'judge:model' } },
        citationAudit: AUDIT,
      }),
      undefined,
    );
    expect(judge.calls).toHaveLength(2);
  });

  it("the claim pass's typed refusal fires first even with both verdicts in hand", async () => {
    const { internals } = judgesHarness({
      claimHangMs: 100,
      claimVerdict: {
        text: JSON.stringify({
          contradictions: [{ pair: 0, reason: 'the final inverts the recorded reading' }],
        }),
      },
    });
    await expect(
      executeWorkflow(
        internals,
        makeOrchestratorWorkflow('goal', {
          acceptance: { childPolicy: 'all-ok' },
          synthesis: { limits: { maxTurns: 3 } },
          claimConsistency: { stage: 'final', onFound: 'fail', judge: { model: 'judge:model' } },
          citationAudit: AUDIT,
        }),
        undefined,
      ),
    ).rejects.toSatisfy((thrown: unknown) => {
      expect(thrown).toBeInstanceOf(FailRunError);
      const data = (thrown as FailRunError).data as { source?: string };
      expect(data.source).toBe('orchestrator_claim_consistency');
      return true;
    });
  });
});

describe("the 'digest' draft policy (RV4210)", () => {
  it('refuses the combinations that would ship the digest, and garbage literals', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { skipWhenDraftValid: true },
        finishValidation: { validators: ACCEPT_ALL, draftPolicy: 'digest' },
      }),
    ).toThrow(/'digest' refuses synthesis.skipWhenDraftValid/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { fallbackToValidDraft: true },
        finishValidation: { validators: ACCEPT_ALL, draftPolicy: 'digest' },
      }),
    ).toThrow(/'digest' refuses synthesis.fallbackToValidDraft/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        finishValidation: { validators: ACCEPT_ALL, draftPolicy: 'outline' as never },
      }),
    ).toThrow(/must be an object or one of the sentinels 'contract' \| 'digest'/);
  });

  it('asks for the map up front, rejects prose, accepts rows, and pays no extra invocation', async () => {
    const DIGEST_DRAFT =
      '- section exec: audit-write failures never mask success; evidence src/exec.ts:260\n' +
      '- section retry: bounded ladder; evidence worker reading';
    let orchTurn = 0;
    const coordinationPrompts: string[] = [];
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'A failed audit write does not mask success (`src/exec.ts:256-296`).' };
      }
      coordinationPrompts.push(textOf(req));
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'read the span' },
          },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      if (orchTurn === 3) {
        // Prose with no rows: the gate must bounce it as a normal
        // turn (no repair spent) with the digest feedback.
        return { toolCall: { name: 'finish', args: { result: 'a long prose paragraph' } } };
      }
      return { toolCall: { name: 'finish', args: { result: DIGEST_DRAFT } } };
    });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'composed prose' } } }),
      { id: 'strong' },
    );
    const { internals, store } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        finishValidation: { validators: ACCEPT_ALL, maxRepairs: 1, draftPolicy: 'digest' },
      }),
      undefined,
    );
    expect((outcome as { result?: unknown }).result).toBe('composed prose');
    // The instruction rides the prompt up front: learning the map by
    // rejection would pay for the prose draft first.
    expect(coordinationPrompts[0]).toContain('a DIGEST, not prose');
    // The prose bounce journals as the draft gate's rejection with
    // the digest reasons; the accepted digest journals nothing.
    const entries = await store.load('test-run');
    const gate = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_draft_gate',
    );
    const failed = (gate?.value as { failed?: { name: string; reasons: string[] }[] }).failed;
    expect(failed?.[0]?.name).toBe('digest-policy');
    expect(failed?.[0]?.reasons.join(' ')).toContain('no evidence rows');
    // No hidden invocation growth: one coordination span, one worker,
    // one synthesis; the digest is one more TURN of the same loop.
    const spans = entries.filter(
      (entry) =>
        entry.kind === 'agent' && entry.status !== 'running' && entry.status !== 'suspended',
    );
    expect(spans).toHaveLength(3);
  });

  it('the word ceiling has teeth: over-long digests bounce with the compression remedy', async () => {
    let orchTurn = 0;
    const longProse = `- row\n${'word '.repeat(450)}`;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'reading' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'read the span' },
          },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      if (orchTurn === 3) {
        return { toolCall: { name: 'finish', args: { result: longProse } } };
      }
      return { toolCall: { name: 'finish', args: { result: '- compact row: evidence' } } };
    });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'composed' } } }),
      { id: 'strong' },
    );
    const { internals, store } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        finishValidation: { validators: ACCEPT_ALL, maxRepairs: 1, draftPolicy: 'digest' },
      }),
      undefined,
    );
    expect((outcome as { result?: unknown }).result).toBe('composed');
    const gate = (await store.load('test-run')).find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_draft_gate',
    );
    const failed = (gate?.value as { failed?: { name: string; reasons: string[] }[] }).failed;
    expect(failed?.[0]?.reasons.join(' ')).toContain('word ceiling');
  });
});
