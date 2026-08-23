/**
 * The semantic terminal verdict (RV4209, the sixth comparison
 * experiment). The envelope carried every semantic FACT and no surface
 * answered the production question in one word: the experiment's run
 * settled ok under a standing waiver with three unsupported citations,
 * strict exited 0 by documented design, and every consumer re-derived
 * its own verdict from four fields. These tests pin the ONE fold, its
 * precedence, the production predicate over it, and the end-to-end
 * ride: envelope value, lifted outcome field, and terminal envelope
 * all carry the SAME object.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { createEngine } from '../engine/engine.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { productionAcceptable, semanticTerminalVerdictOf } from './semantic-verdict.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

describe('semanticTerminalVerdictOf precedence (RV4209)', () => {
  it('returns undefined when nothing was configured: absence stays NOT RECORDED', () => {
    expect(semanticTerminalVerdictOf({})).toBeUndefined();
  });

  it('clean: every judge ruled on the shipped document and found nothing', () => {
    const verdict = semanticTerminalVerdictOf({
      claimConsistencyMeta: { coverage: 'full', findings: 0, judgedHash: 'a'.repeat(64) },
      citationAuditMeta: { unsupported: 0, partial: 0, auditedHash: 'a'.repeat(64) },
    });
    expect(verdict?.verdict).toBe('clean');
    expect(verdict?.finalHash).toBe('a'.repeat(64));
    expect(productionAcceptable(verdict).ok).toBe(true);
  });

  it('findings beat every other reading', () => {
    const verdict = semanticTerminalVerdictOf({
      claimConsistencyMeta: { coverage: 'full', findings: 1, judgedHash: 'a'.repeat(64) },
      claimCoverageWaiver: { principal: 'owner', reason: 'benchmark', coverage: 'partial' },
    });
    expect(verdict?.verdict).toBe('findings');
    expect(verdict?.contradictions).toBe(1);
    expect(productionAcceptable(verdict)).toEqual({
      ok: false,
      reason: 'findings: 1 contradiction(s), 0 unsupported citation(s)',
    });
  });

  it('unsupported citations are findings too', () => {
    const verdict = semanticTerminalVerdictOf({
      citationAuditMeta: { unsupported: 3, partial: 1, auditedHash: 'a'.repeat(64) },
    });
    expect(verdict?.verdict).toBe('findings');
    expect(verdict?.unsupportedCitations).toBe(3);
    expect(verdict?.partialCitations).toBe(1);
  });

  it("the experiment's shape: a standing waiver over partial coverage reads 'waived', never clean", () => {
    const verdict = semanticTerminalVerdictOf({
      claimConsistencyMeta: { coverage: 'partial', findings: 0, judgedHash: 'a'.repeat(64) },
      claimCoverageWaiver: {
        principal: 'benchmark-owner',
        reason: 'known gap',
        expiresAt: '2026-08-22T00:00:00Z',
        coverage: 'partial',
      },
    });
    expect(verdict?.verdict).toBe('waived');
    expect(verdict?.waiver?.principal).toBe('benchmark-owner');
    const gate = productionAcceptable(verdict);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain('waived by benchmark-owner');
  });

  it('partial and vacuous coverage read as themselves without a waiver', () => {
    expect(
      semanticTerminalVerdictOf({
        claimConsistencyMeta: { coverage: 'partial', findings: 0, judgedHash: 'a'.repeat(64) },
      })?.verdict,
    ).toBe('partial');
    expect(
      semanticTerminalVerdictOf({
        claimConsistencyMeta: {
          coverage: 'critical-uncovered',
          findings: 0,
          judgedHash: 'a'.repeat(64),
        },
      })?.verdict,
    ).toBe('partial');
    expect(
      semanticTerminalVerdictOf({
        claimConsistencyMeta: { coverage: 'vacuous', findings: 0, judgedHash: 'a'.repeat(64) },
      })?.verdict,
    ).toBe('vacuous');
  });

  it('a failed or declined judge is not-judged, never clean', () => {
    const failed = semanticTerminalVerdictOf({
      claimConsistencyMeta: { judgeFailed: true, coverage: 'judge-failed' },
      citationAuditMeta: { judgeDeclined: true },
    });
    expect(failed?.verdict).toBe('not-judged');
    expect(failed?.judgeFailures).toEqual(['claim-judge-failed', 'citation-judge-declined']);
    expect(productionAcceptable(failed).ok).toBe(false);
  });

  it('a draft-stage verdict the synthesis rewrote is not-judged (RV3207)', () => {
    const verdict = semanticTerminalVerdictOf({
      claimConsistencyMeta: { judgedStage: 'draft', coverage: 'full', findings: 0 },
      draftToFinal: { rewritten: true },
    });
    expect(verdict?.verdict).toBe('not-judged');
    expect(verdict?.judgeFailures).toEqual(['draft-rewritten-unjudged']);
  });

  it('a meta with no evidence anything judged is not-judged, never clean (RV4402)', () => {
    const empty = semanticTerminalVerdictOf({ claimConsistencyMeta: {} });
    expect(empty?.verdict).toBe('not-judged');
    expect(empty?.judgeFailures).toContain('claim-meta-unjudged');
    expect(productionAcceptable(empty).ok).toBe(false);
    const auditEmpty = semanticTerminalVerdictOf({
      claimConsistencyMeta: { coverage: 'full', findings: 0, judgedHash: 'a'.repeat(64) },
      citationAuditMeta: {},
    });
    expect(auditEmpty?.verdict).toBe('not-judged');
    expect(auditEmpty?.judgeFailures).toEqual(['citation-meta-unjudged']);
    // judgeInvoked false WITH the stamped hash is the legitimate
    // "no pair existed to judge" meta, not garbage.
    expect(
      semanticTerminalVerdictOf({
        claimConsistencyMeta: {
          coverage: 'vacuous',
          findings: 0,
          judgeInvoked: false,
          judgedHash: 'a'.repeat(64),
        },
      })?.verdict,
    ).toBe('vacuous');
  });

  it('a malformed counter taints its meta toward not-judged, never 0 (RV4402)', () => {
    const claimGarbage = semanticTerminalVerdictOf({
      claimConsistencyMeta: { coverage: 'full', findings: '3', judgedHash: 'a'.repeat(64) },
    });
    expect(claimGarbage?.verdict).toBe('not-judged');
    expect(claimGarbage?.judgeFailures).toEqual(['claim-meta-malformed']);
    const auditGarbage = semanticTerminalVerdictOf({
      citationAuditMeta: { unsupported: -1, partial: 0, auditedHash: 'a'.repeat(64) },
    });
    expect(auditGarbage?.verdict).toBe('not-judged');
    expect(auditGarbage?.judgeFailures).toEqual(['citation-meta-malformed']);
    const gate = productionAcceptable(claimGarbage);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain('claim-meta-malformed');
  });

  it('the production gate is fail closed on absence', () => {
    const gate = productionAcceptable(undefined);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain('not-recorded');
  });
});

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

function adapters(finalText: string) {
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
  const judge = scriptedAdapter(
    (req): ScriptedTurn => {
      if (textOf(req).includes('You audit CITATIONS')) {
        const verdicts: { row: number; verdict: string; reason: string }[] = [];
        for (const match of textOf(req).matchAll(/"row":(\d+)/gu)) {
          verdicts.push({ row: Number(match[1]), verdict: 'supported', reason: 'entails' });
        }
        return { text: JSON.stringify({ verdicts }) };
      }
      return { text: JSON.stringify({ contradictions: [] }) };
    },
    { id: 'judge' },
  );
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: finalText } } }),
    { id: 'strong' },
  );
  return [coordination, judge, synthesis];
}

const CLEAN_FINAL = 'final: an audit-write failure does not mask success [src/exec.ts:260].';

describe('the verdict rides every surface end to end (RV4209)', () => {
  it("a clean run stamps 'clean' on the value, the outcome lift, and the terminal envelope", async () => {
    const engine = createEngine({
      adapters: adapters(CLEAN_FINAL),
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
        profiles: { worker: { description: 'reads one span' } },
      },
    });
    const outcome = await engine.run(
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'final', judge: { model: 'judge:model' } },
        citationAudit: {
          resolve: () => 'the cited line, verbatim',
          judge: { model: 'judge:model' },
        },
      }),
      undefined,
    ).result;
    expect(outcome.status).toBe('ok');
    const onValue = (outcome.value as { semanticTerminalVerdict?: Record<string, unknown> })
      .semanticTerminalVerdict;
    expect(onValue?.verdict).toBe('clean');
    // ONE derivation, three surfaces: the lift and the envelope carry
    // the same object.
    expect(outcome.semanticTerminalVerdict?.verdict).toBe('clean');
    expect(
      (outcome.envelope.semanticTerminalVerdict as { verdict?: unknown } | undefined)?.verdict,
    ).toBe('clean');
    // The judged-hash binding: the verdict names the shipped bytes.
    expect(onValue?.finalHash).toBe(
      (outcome.claimConsistencyMeta as { judgedHash?: unknown } | undefined)?.judgedHash,
    );
  });

  it("a partial final grade under 'report' stamps 'partial' without stopping the run", async () => {
    const PARTIAL_FINAL =
      'final: an audit-write failure does not mask success [src/exec.ts:260]. ' +
      'final: the retry ladder caps at three attempts [src/retry.ts:24].';
    const { internals } = makeInternals({
      adapters: adapters(PARTIAL_FINAL),
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: { worker: { description: 'reads one span' } },
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'final', judge: { model: 'judge:model' } },
      }),
      undefined,
    )) as Record<string, unknown>;
    const verdict = outcome.semanticTerminalVerdict as Record<string, unknown>;
    expect(verdict.verdict).toBe('partial');
    expect(verdict.coverage).toBe('partial');
    expect(productionAcceptable(verdict as never).ok).toBe(false);
  });
});
