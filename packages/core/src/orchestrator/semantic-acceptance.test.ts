/**
 * The atomic production posture (RV4201, the sixth comparison
 * experiment). The experiment's run was configured knob by knob into
 * "observe and ship anyway": report postures, a standing waiver, no
 * repair round; every choice individually legal, their sum a run that
 * settled accepted over a partial grade, a judged contradiction and
 * five unsupported citations. These tests pin the declaration that
 * says the opposite in one object: the intake that refuses every
 * contradicting underlying field (a signature has no blanks and no
 * contradictions), the 'forbid' waiver posture, and the pinned-hash
 * waiver that licenses exactly one reviewed document.
 */
import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ConfigError, FailRunError } from '../l0/errors.js';
import type { ChatRequest } from '../l0/messages.js';
import { jcsSerialize } from '../l0/jcs.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import {
  makeOrchestratorWorkflow,
  type OrchestrateOptions,
  type OrchestrateSemanticAcceptance,
} from './orchestrate.js';

const PROFILES = { worker: { description: 'reads one span' } };
const POOL_EXEC = 'A failed audit write does not mask success (`src/exec.ts:256-296`).';
const POOL_OTEL = 'The exporter drops unknown attributes before batching, see `src/otel.ts:18`.';

const SNAPSHOT: Record<string, string> = {
  'src/exec.ts:260': 'if (!auditWrite.ok) { keepSuccess(); }',
  'src/otel.ts:18': 'attributes: dropUnknown(config.exporter),',
};
const resolveSnapshot = (target: { path: string; line: number }): string | undefined =>
  SNAPSHOT[`${target.path}:${String(target.line)}`];

const DECLARATION: OrchestrateSemanticAcceptance = {
  judgedStage: 'final',
  claimCoverage: 'full',
  contradictions: 'fail',
  citations: 'fail',
  unresolved: 'fail',
  waiver: 'forbid',
};

const STRICT_MACHINERY = {
  acceptance: { childPolicy: 'all-ok' as const },
  synthesis: { limits: { maxTurns: 3 } },
  claimConsistency: {
    stage: 'final' as const,
    coveragePolicy: 'strict-final' as const,
    onFound: 'fail' as const,
    judge: { model: 'judge:model' as const },
  },
  citationAudit: {
    resolve: resolveSnapshot,
    onFound: 'fail' as const,
    judge: { model: 'judge:model' as const },
  },
};

describe('semanticAcceptance intake (RV4201): a signature has no blanks and no contradictions', () => {
  it('accepts the consistent fail form and the consistent repair form', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', { ...STRICT_MACHINERY, semanticAcceptance: DECLARATION }),
    ).not.toThrow();
    expect(() =>
      makeOrchestratorWorkflow('g', {
        ...STRICT_MACHINERY,
        claimConsistency: {
          ...STRICT_MACHINERY.claimConsistency,
          onFound: 'repair',
          coverageRepair: true,
        },
        citationAudit: { ...STRICT_MACHINERY.citationAudit, onFound: 'repair' },
        semanticAcceptance: {
          ...DECLARATION,
          contradictions: 'repair-once-then-fail',
          citations: 'repair-once-then-fail',
        },
      }),
    ).not.toThrow();
  });

  it.each([
    [
      'a wrong judgedStage literal',
      { ...STRICT_MACHINERY, semanticAcceptance: { ...DECLARATION, judgedStage: 'draft' } },
      /judgedStage must be the literal 'final'/,
    ],
    [
      'an unknown key',
      {
        ...STRICT_MACHINERY,
        semanticAcceptance: { ...DECLARATION, vibes: 'good' },
      },
      /carries unknown key 'vibes'/,
    ],
    [
      'a missing claim pass',
      {
        acceptance: { childPolicy: 'all-ok' as const },
        synthesis: {},
        citationAudit: STRICT_MACHINERY.citationAudit,
        semanticAcceptance: DECLARATION,
      },
      /requires claimConsistency/,
    ],
    [
      'a missing audit',
      {
        acceptance: { childPolicy: 'all-ok' as const },
        synthesis: {},
        claimConsistency: STRICT_MACHINERY.claimConsistency,
        semanticAcceptance: DECLARATION,
      },
      /requires citationAudit/,
    ],
    [
      // The RV4003 rule fires first here (strict-final needs a stage
      // past the draft), so the declaration's own stage check is a
      // second lock on the same door.
      'an undeclared stage',
      {
        ...STRICT_MACHINERY,
        claimConsistency: {
          coveragePolicy: 'strict-final' as const,
          onFound: 'fail' as const,
          judge: { model: 'judge:model' as const },
        },
        semanticAcceptance: DECLARATION,
      },
      /needs stage 'final' or 'both'/,
    ],
    [
      'an undeclared coverage policy',
      {
        ...STRICT_MACHINERY,
        claimConsistency: {
          stage: 'final' as const,
          onFound: 'fail' as const,
          judge: { model: 'judge:model' as const },
        },
        semanticAcceptance: DECLARATION,
      },
      /coveragePolicy 'strict-final', declared/,
    ],
    [
      'a coverage target below 1',
      {
        ...STRICT_MACHINERY,
        claimConsistency: { ...STRICT_MACHINERY.claimConsistency, coverageTarget: 0.72 },
        semanticAcceptance: DECLARATION,
      },
      /refuses coverageTarget 0\.72/,
    ],
    [
      'an observing claim posture',
      {
        ...STRICT_MACHINERY,
        claimConsistency: { ...STRICT_MACHINERY.claimConsistency, onFound: 'report' },
        semanticAcceptance: DECLARATION,
      },
      /requires claimConsistency\.onFound 'fail', declared/,
    ],
    [
      'a repair declaration without the coverage arm',
      {
        ...STRICT_MACHINERY,
        claimConsistency: { ...STRICT_MACHINERY.claimConsistency, onFound: 'repair' },
        citationAudit: { ...STRICT_MACHINERY.citationAudit, onFound: 'repair' },
        semanticAcceptance: {
          ...DECLARATION,
          contradictions: 'repair-once-then-fail',
          citations: 'repair-once-then-fail',
        },
      },
      /requires claimConsistency\.coverageRepair: true/,
    ],
    [
      'an observing audit posture',
      {
        ...STRICT_MACHINERY,
        citationAudit: { ...STRICT_MACHINERY.citationAudit, onFound: 'report' },
        semanticAcceptance: DECLARATION,
      },
      /requires citationAudit\.onFound 'fail', declared/,
    ],
    [
      'a standing waiver under forbid',
      {
        ...STRICT_MACHINERY,
        claimConsistency: {
          ...STRICT_MACHINERY.claimConsistency,
          waiver: { principal: 'ops', reason: 'gap' },
        },
        semanticAcceptance: DECLARATION,
      },
      /'forbid' refuses a declared claimConsistency\.waiver/,
    ],
    [
      'a pin with no declared waiver',
      {
        ...STRICT_MACHINERY,
        semanticAcceptance: { ...DECLARATION, waiver: { judgedHash: 'a'.repeat(64) } },
      },
      /declare the waiver it pins/,
    ],
    [
      'a malformed pin',
      {
        ...STRICT_MACHINERY,
        claimConsistency: {
          ...STRICT_MACHINERY.claimConsistency,
          waiver: { principal: 'ops', reason: 'gap' },
        },
        semanticAcceptance: { ...DECLARATION, waiver: { judgedHash: 'NOT-A-HASH' } },
      },
      /judgedHash must be 64 lowercase hex chars/,
    ],
    [
      'a garbage waiver mode',
      { ...STRICT_MACHINERY, semanticAcceptance: { ...DECLARATION, waiver: 'maybe' } },
      /waiver must be 'forbid' or \{ judgedHash \}/,
    ],
  ] as Array<[string, OrchestrateOptions, RegExp]>)('refuses %s', (label, opts, pattern) => {
    expect(() => makeOrchestratorWorkflow('g', opts), label).toThrow(ConfigError);
    expect(() => makeOrchestratorWorkflow('g', opts), label).toThrow(pattern);
  });
});

// ---- The wired declaration: clean settles, dirty cannot.

const FINAL_CLEAN = [
  '# Audit',
  '',
  '## Exec',
  '',
  'final: a failed audit write keeps success intact [src/exec.ts:260].',
  '',
  '## Otel',
  '',
  'The exporter drops unknown attributes ahead of batching [src/otel.ts:18].',
].join('\n');

// The otel sentence loses its pool grounding when the otel child is
// absent, so the FINAL grade is an honest 'partial'.
const CLAIM_AGREES: ScriptedTurn = { text: JSON.stringify({ contradictions: [] }) };
const CITE_CLEAN: ScriptedTurn = {
  text: JSON.stringify({
    verdicts: [
      { row: 0, verdict: 'supported', reason: 'the line preserves success' },
      { row: 1, verdict: 'supported', reason: 'the line drops unknown attributes' },
    ],
  }),
};

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

function acceptanceHarness(options: { children: readonly string[]; final: string }) {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      const prompt = textOf(req);
      const index = Number(prompt.slice(prompt.lastIndexOf('read ') + 5).trim());
      return { text: options.children[index] ?? '' };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCalls: options.children.map((_, index) => ({
          name: 'spawn_agent',
          args: { agentType: 'worker', prompt: `read ${String(index)}` },
        })),
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft before synthesis' } } };
  });
  const judge = scriptedAdapter(
    (req): ScriptedTurn =>
      textOf(req).includes('claim-consistency judge') ? CLAIM_AGREES : CITE_CLEAN,
    { id: 'judge' },
  );
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: options.final } } }),
    { id: 'strong' },
  );
  const { internals, store } = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { internals, store };
}

const judgedHashOf = (document: string): string =>
  createHash('sha256').update(jcsSerialize(document), 'utf8').digest('hex');

describe('the wired declaration (RV4201): clean settles, dirty physically cannot', () => {
  it('a full-coverage, contradiction-free, entailed document settles, verdicts on the shipped hash', async () => {
    const { internals } = acceptanceHarness({
      children: [POOL_EXEC, POOL_OTEL],
      final: FINAL_CLEAN,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_MACHINERY,
        semanticAcceptance: DECLARATION,
      }),
      undefined,
    )) as {
      result: unknown;
      claimConsistencyMeta?: Record<string, unknown>;
      citationAuditMeta?: Record<string, unknown>;
      draftToFinal?: { finalHash: string };
      claimCoverageWaiver?: unknown;
    };
    expect(outcome.result).toBe(FINAL_CLEAN);
    expect(outcome.claimConsistencyMeta?.coverage).toBe('full');
    expect(outcome.claimConsistencyMeta?.judgedHash).toBe(outcome.draftToFinal?.finalHash);
    expect(outcome.citationAuditMeta?.auditedHash).toBe(outcome.draftToFinal?.finalHash);
    expect('claimCoverageWaiver' in outcome).toBe(false);
  });

  it("waiver 'forbid': a partial grade refuses typed, naming the forbidding declaration", async () => {
    const { internals } = acceptanceHarness({ children: [POOL_EXEC], final: FINAL_CLEAN });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_MACHINERY,
        semanticAcceptance: DECLARATION,
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as FailRunError).message)).toContain('admits no waiver');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.coverage).toBe('partial');
    expect(data.semanticAcceptanceWaiver).toBe('forbid');
  });

  it("a declared full coverage cut by the pair ceiling refuses as 'coverage-capped', naming the knob (RV4404)", async () => {
    // Both pool children ground both citing sentences, so the POOL is
    // not the limit; max: 1 is. The seventh comparison run declared
    // full coverage over a truncated fold and reported 23 uncovered
    // sentences as if the document were the problem.
    const { internals } = acceptanceHarness({
      children: [POOL_EXEC, POOL_OTEL],
      final: FINAL_CLEAN,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_MACHINERY,
        claimConsistency: { ...STRICT_MACHINERY.claimConsistency, max: 1 },
        semanticAcceptance: DECLARATION,
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const message = String((thrown as FailRunError).message);
    expect(message).toContain("'coverage-capped'");
    expect(message).toContain('the pair ceiling max=1 cut selection');
    expect(message).toContain('raise claimConsistency.max');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.coverage).toBe('coverage-capped');
  });

  it('the pinned waiver licenses exactly the reviewed document: a foreign hash refuses', async () => {
    const { internals } = acceptanceHarness({ children: [POOL_EXEC], final: FINAL_CLEAN });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_MACHINERY,
        claimConsistency: {
          ...STRICT_MACHINERY.claimConsistency,
          waiver: { principal: 'release-owner', reason: 'reviewed dossier' },
        },
        semanticAcceptance: { ...DECLARATION, waiver: { judgedHash: 'b'.repeat(64) } },
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as FailRunError).message)).toContain('pinned to judgedHash');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.waiverPinnedHash).toBe('b'.repeat(64));
    expect(data.judgedHash).toBe(judgedHashOf(FINAL_CLEAN));
  });

  it('the pinned waiver honors the pinned document, and the journaled decision carries the pin', async () => {
    const pin = judgedHashOf(FINAL_CLEAN);
    const { internals, store } = acceptanceHarness({ children: [POOL_EXEC], final: FINAL_CLEAN });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_MACHINERY,
        claimConsistency: {
          ...STRICT_MACHINERY.claimConsistency,
          waiver: { principal: 'release-owner', reason: 'reviewed dossier' },
        },
        semanticAcceptance: { ...DECLARATION, waiver: { judgedHash: pin } },
      }),
      undefined,
    )) as {
      claimConsistencyMeta?: Record<string, unknown>;
      claimCoverageWaiver?: Record<string, unknown>;
    };
    expect(outcome.claimConsistencyMeta?.coverage).toBe('partial');
    expect(outcome.claimCoverageWaiver).toMatchObject({
      principal: 'release-owner',
      coverage: 'partial',
    });
    const entries = await store.load(internals.runId);
    const waived = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'claim_coverage_waived',
    );
    expect((waived?.value as { judgedHash?: string }).judgedHash).toBe(pin);
  });

  it('an unsupported citation under the declaration stops the run typed (the audit posture holds)', async () => {
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = textOf(req);
        const index = Number(prompt.slice(prompt.lastIndexOf('read ') + 5).trim());
        return { text: [POOL_EXEC, POOL_OTEL][index] ?? '' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [POOL_EXEC, POOL_OTEL].map((_, index) => ({
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: `read ${String(index)}` },
          })),
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft before synthesis' } } };
    });
    const badJudge = scriptedAdapter(
      (req): ScriptedTurn =>
        textOf(req).includes('claim-consistency judge')
          ? CLAIM_AGREES
          : {
              text: JSON.stringify({
                verdicts: [
                  { row: 0, verdict: 'supported', reason: 'preserved' },
                  { row: 1, verdict: 'unsupported', reason: 'the line is about something else' },
                ],
              }),
            },
      { id: 'judge' },
    );
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: FINAL_CLEAN } } }),
      { id: 'strong' },
    );
    const rig = makeInternals({
      adapters: [coordination, badJudge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const thrown = await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_MACHINERY,
        semanticAcceptance: DECLARATION,
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(((thrown as FailRunError).data as { source?: string }).source).toBe(
      'orchestrator_citation_audit',
    );
  });
});
