/**
 * The citation entailment audit (RV4004, the fifth comparison
 * experiment): three citations in the shipped answer were mechanically
 * valid, value-clean, invisible to a pool that held no reading of
 * their files, and simply not entailed by their cited lines. The
 * independent judge caught all three by sampling citing sentences,
 * reading the cited lines, and asking whether the text entails the
 * sentence; this file pins that method internalized: the deterministic
 * sample, the pure excerpt channel, the judged verdicts, the postures,
 * and the bounded repair round.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { acceptanceTailRequiredUsd, formatAcceptanceTailTerms } from './admission.js';
import {
  citationExcerptOf,
  parseCitationVerdicts,
  resolveCitationAuditPlan,
  sampleCitationRows,
} from './citation-audit.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'reads one span' } };

describe('the deterministic sample (RV4004)', () => {
  const DOC = [
    '# Audit',
    '',
    '## Grid',
    '',
    'The exporter drops SLO attributes [src/otel.ts:18]. A second claim rides here [src/otel.ts:20].',
    'A third claim sits beside them [src/otel.ts:22].',
    '',
    '## Verdict',
    '',
    'The retry ladder caps at three attempts [src/retry.ts:24-26].',
  ].join('\n');

  it('samples per section, deterministically from the seed, ranges parsed', () => {
    const plan = { pattern: '[\\w./-]+\\.\\w+:\\d+', samplePerSection: 2, maxSampled: 24 };
    const first = sampleCitationRows(DOC, plan, 'seed-a');
    const second = sampleCitationRows(DOC, plan, 'seed-a');
    expect(second).toEqual(first);
    const other = sampleCitationRows(DOC, plan, 'seed-b');
    expect(other.length).toBe(first.length);
    // Two from '## Grid' (three candidates, K=2), one from '## Verdict'.
    expect(first.filter((row) => row.section === '## Grid')).toHaveLength(2);
    const verdictRow = first.find((row) => row.section === '## Verdict');
    expect(verdictRow?.path).toBe('src/retry.ts');
    expect(verdictRow?.line).toBe(24);
    expect(verdictRow?.endLine).toBe(26);
  });

  it('caps by pick rank across sections, first picks seat first', () => {
    const plan = { pattern: '[\\w./-]+\\.\\w+:\\d+', samplePerSection: 2, maxSampled: 2 };
    const rows = sampleCitationRows(DOC, plan, 'seed-a');
    expect(rows).toHaveLength(2);
    // One per section before any section's second pick.
    expect(new Set(rows.map((row) => row.section)).size).toBe(2);
  });

  it('validates the plan numbers and the pattern fail closed', () => {
    expect(() => resolveCitationAuditPlan({ samplePerSection: 0 })).toThrow(ConfigError);
    expect(() => resolveCitationAuditPlan({ maxSampled: 1.5 })).toThrow(ConfigError);
    expect(() => resolveCitationAuditPlan({ window: -1 })).toThrow(ConfigError);
    expect(() => resolveCitationAuditPlan({ pattern: '(' })).toThrow(/does not compile/);
    expect(() => resolveCitationAuditPlan({ pattern: 'x*' })).toThrow(/empty string/);
    expect(resolveCitationAuditPlan({})).toEqual({
      pattern: '[\\w./-]+\\.\\w+:\\d+',
      samplePerSection: 2,
      maxSampled: 24,
      window: 3,
      resolver: 1,
    });
  });

  it('excerpts read through the pure resolver: window, ranges, unresolvable first line', () => {
    const lines: Record<string, string> = {
      'src/retry.ts:24': 'const MAX_ATTEMPTS = 3;',
      'src/retry.ts:25': 'const BASE_DELAY = 100;',
      'src/retry.ts:26': 'export const ladder = { MAX_ATTEMPTS, BASE_DELAY };',
    };
    const resolve = (target: { path: string; line: number }): string | undefined =>
      lines[`${target.path}:${String(target.line)}`];
    const ranged = citationExcerptOf(resolve, { path: 'src/retry.ts', line: 24, endLine: 26 }, 3);
    expect(ranged).toBe(
      'L24: const MAX_ATTEMPTS = 3;\nL25: const BASE_DELAY = 100;\n' +
        'L26: export const ladder = { MAX_ATTEMPTS, BASE_DELAY };',
    );
    // A range past the snapshot's end reads as far as it goes.
    const overrun = citationExcerptOf(resolve, { path: 'src/retry.ts', line: 26, endLine: 40 }, 3);
    expect(overrun).toBe('L26: export const ladder = { MAX_ATTEMPTS, BASE_DELAY };');
    // The FIRST line failing to resolve is no excerpt at all.
    expect(citationExcerptOf(resolve, { path: 'src/gone.ts', line: 1 }, 3)).toBeUndefined();
  });

  it('parses judge verdicts strictly: every row once, closed vocabulary', () => {
    const ok = parseCitationVerdicts(
      { verdicts: [{ row: 0, verdict: 'supported', reason: 'entails' }] },
      [0],
    );
    expect(ok?.get(0)?.verdict).toBe('supported');
    expect(parseCitationVerdicts({ verdicts: [] }, [0])).toBeUndefined();
    expect(
      parseCitationVerdicts({ verdicts: [{ row: 0, verdict: 'meh', reason: 'x' }] }, [0]),
    ).toBeUndefined();
    expect(
      parseCitationVerdicts(
        {
          verdicts: [
            { row: 0, verdict: 'supported', reason: 'a' },
            { row: 0, verdict: 'partial', reason: 'b' },
          ],
        },
        [0],
      ),
    ).toBeUndefined();
    // The bijection (RV4402): a fabricated extra row is a parse
    // failure, never surplus information.
    expect(
      parseCitationVerdicts(
        {
          verdicts: [
            { row: 0, verdict: 'supported', reason: 'a' },
            { row: 999, verdict: 'supported', reason: 'invented' },
          ],
        },
        [0],
      ),
    ).toBeUndefined();
  });
});

describe('the acceptance tail prices the audit judge (RV4004)', () => {
  it('adds the declared citation judge passes, two under its armed round, and the round composition', () => {
    const report = acceptanceTailRequiredUsd({
      synthesisReserveUsd: 1.0,
      citationJudgeEstCostUsd: 0.25,
      citationOnFound: 'report',
      workingRoomUsd: 0.5,
    });
    expect(report.requiredUsd).toBeCloseTo(1.75, 10);
    expect(report.terms.citationJudgePasses).toBe(1);
    const repair = acceptanceTailRequiredUsd({
      synthesisReserveUsd: 1.0,
      synthesisEstCostUsd: 0.3,
      citationJudgeEstCostUsd: 0.25,
      citationOnFound: 'repair',
      workingRoomUsd: 0.5,
    });
    // 1.0 + round composition 0.3 + citation judge 0.25 x 2 + 0.5.
    expect(repair.requiredUsd).toBeCloseTo(2.3, 10);
    expect(repair.terms.citationJudgePasses).toBe(2);
    expect(repair.terms.roundCompositionUsd).toBeCloseTo(0.3, 10);
    expect(formatAcceptanceTailTerms(repair.terms)).toContain('citation judge 0.2500 x 2 pass(es)');
    // A claim pass past the draft rejudges the rewritten document.
    const withClaim = acceptanceTailRequiredUsd({
      claimStage: 'final',
      claimOnFound: 'report',
      claimJudgeEstCostUsd: 0.2,
      claimConfigured: true,
      citationJudgeEstCostUsd: 0.25,
      citationOnFound: 'repair',
      synthesisEstCostUsd: 0.3,
      workingRoomUsd: 0,
    });
    // claim judge 0.2 x (1 + 1 rejudge) + citation 0.25 x 2 + composition 0.3.
    expect(withClaim.requiredUsd).toBeCloseTo(0.4 + 0.5 + 0.3, 10);
    expect(withClaim.terms.judgePasses).toBe(2);
    // Undeclared audit keeps the terms absent and the bytes stable.
    const bare = acceptanceTailRequiredUsd({ workingRoomUsd: 0.5 });
    expect(bare.terms.citationJudgePasses).toBeUndefined();
    expect(formatAcceptanceTailTerms(bare.terms)).not.toContain('citation judge');
  });
});

const SNAPSHOT: Record<string, string> = {
  'src/otel.ts:18': 'attributes: dropUnknown(config.exporter),',
  'src/otel.ts:19': 'batchWindowMs: 500,',
  'src/retry.ts:24': 'const MAX_ATTEMPTS = 3;',
  'src/retry.ts:25': 'const BASE_DELAY = 100;',
};
const resolveSnapshot = (target: { path: string; line: number }): string | undefined =>
  SNAPSHOT[`${target.path}:${String(target.line)}`];

const FINAL_MIXED = [
  '# Audit',
  '',
  '## Grid',
  '',
  'No SLO observations exist anywhere in the exporter [src/otel.ts:18].',
  '',
  '## Verdict',
  '',
  'The retry ladder caps at three attempts [src/retry.ts:24].',
].join('\n');

const FINAL_REPAIRED = [
  '# Audit',
  '',
  '## Grid',
  '',
  'The exporter drops unknown attributes before batching [src/otel.ts:18].',
  '',
  '## Verdict',
  '',
  'The retry ladder caps at three attempts [src/retry.ts:24].',
].join('\n');

function auditHarness(options: { finals: string[]; judgeTurns: (call: number) => ScriptedTurn }) {
  let synthCall = 0;
  const coordination = scriptedAdapter((): ScriptedTurn => ({
    toolCall: { name: 'finish', args: { result: 'the coordination draft' } },
  }));
  let judgeCall = 0;
  const judge = scriptedAdapter((): ScriptedTurn => options.judgeTurns((judgeCall += 1)), {
    id: 'judge',
  });
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => {
      const text = options.finals[Math.min(synthCall, options.finals.length - 1)] ?? '';
      synthCall += 1;
      return { toolCall: { name: 'finish', args: { result: text } } };
    },
    { id: 'strong' },
  );
  const { internals, store } = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return {
    internals,
    store,
    judgeCalls: () => judgeCall,
    synthCalls: () => synthCall,
  };
}

const AUDIT_BASE = {
  acceptance: { childPolicy: 'all-ok' as const },
  synthesis: {},
};

describe('the audit wired into the orchestrator (RV4004)', () => {
  it("intake refuses garbage postures and a missing resolver; double-armed 'repair' merges (RV4202)", () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        citationAudit: { resolve: resolveSnapshot, onFound: 'shout' as unknown as 'report' },
      }),
    ).toThrow(/onFound must be 'report', 'repair' or 'fail'/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        citationAudit: { resolve: undefined as unknown as typeof resolveSnapshot },
      }),
    ).toThrow(/resolve must be a function/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        citationAudit: { resolve: resolveSnapshot, onFound: 'repair' },
      }),
    ).toThrow(/requires synthesis/);
    // Arming BOTH repairs is legal since RV4202: the pair grants the
    // SAME one bounded round, merged, so intake no longer refuses it.
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        claimConsistency: { stage: 'final', onFound: 'repair' },
        citationAudit: { resolve: resolveSnapshot, onFound: 'repair' },
      }),
    ).not.toThrow();
    expect(() =>
      makeOrchestratorWorkflow('g', {
        citationAudit: { resolve: resolveSnapshot, judge: { estCost: -1 } },
      }),
    ).toThrow(/citationAudit\.judge\.estCost/);
  });

  it("'report' stamps the meta and the findings on the envelope", async () => {
    const rig = auditHarness({
      finals: [FINAL_MIXED],
      judgeTurns: () => ({
        text: JSON.stringify({
          verdicts: [
            {
              row: 0,
              verdict: 'unsupported',
              reason: 'the line sets an exporter attribute policy, not observation absence',
            },
            { row: 1, verdict: 'supported', reason: 'the line pins the attempts constant' },
          ],
        }),
      }),
    });
    const outcome = (await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...AUDIT_BASE,
        citationAudit: { resolve: resolveSnapshot, judge: { model: 'judge:model' } },
      }),
      undefined,
    )) as {
      citationAuditMeta?: Record<string, unknown>;
      citationFindings?: Array<Record<string, unknown>>;
    };
    expect(outcome.citationAuditMeta).toMatchObject({
      sampled: 2,
      supported: 1,
      partial: 0,
      unsupported: 1,
      unresolved: 0,
      judgeInvoked: true,
    });
    expect(outcome.citationFindings).toHaveLength(1);
    expect(outcome.citationFindings?.[0]).toMatchObject({
      verdict: 'unsupported',
      anchor: 'src/otel.ts:18',
      section: '## Grid',
    });
    expect(rig.judgeCalls()).toBe(1);
  });

  it('a citation nothing resolves is unsupported mechanically, no judge for that row', async () => {
    const rig = auditHarness({
      finals: [
        '# A\n\n## Only\n\nA claim over a missing location [src/vanished.ts:9]. ' +
          'The retry ladder caps at three attempts [src/retry.ts:24].',
      ],
      judgeTurns: () => ({
        text: JSON.stringify({
          verdicts: [{ row: 1, verdict: 'supported', reason: 'pinned constant' }],
        }),
      }),
    });
    const outcome = (await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...AUDIT_BASE,
        citationAudit: { resolve: resolveSnapshot, judge: { model: 'judge:model' } },
      }),
      undefined,
    )) as {
      citationAuditMeta?: Record<string, unknown>;
      citationFindings?: Array<Record<string, unknown>>;
    };
    expect(outcome.citationAuditMeta).toMatchObject({
      sampled: 2,
      supported: 1,
      unsupported: 1,
      unresolved: 1,
    });
    expect(outcome.citationFindings?.[0]).toMatchObject({
      verdict: 'unsupported',
      reason: 'the cited location does not resolve in the host snapshot',
    });
  });

  it("'fail' stops the run typed on an unsupported verdict", async () => {
    const rig = auditHarness({
      finals: [FINAL_MIXED],
      judgeTurns: () => ({
        text: JSON.stringify({
          verdicts: [
            { row: 0, verdict: 'unsupported', reason: 'attribute policy, not absence' },
            { row: 1, verdict: 'supported', reason: 'pinned constant' },
          ],
        }),
      }),
    });
    await expect(
      executeWorkflow(
        rig.internals,
        makeOrchestratorWorkflow('audit the executor', {
          ...AUDIT_BASE,
          citationAudit: {
            resolve: resolveSnapshot,
            judge: { model: 'judge:model' },
            onFound: 'fail',
          },
        }),
        undefined,
      ),
    ).rejects.toMatchObject({
      data: {
        source: 'orchestrator_citation_audit',
        // The typed failure is as self-describing as an acceptance
        // (RV4403): the one-word verdict rides the error data, folded
        // by the same RV4209 function, so the settle can persist it
        // and a production gate never answers 'not-judged' about a
        // failure whose own message counts the findings.
        semanticTerminalVerdict: { verdict: 'findings', unsupportedCitations: 1 },
      },
    });
  });

  it("partial verdicts report in every posture: 'fail' does not stop on them", async () => {
    const rig = auditHarness({
      finals: [FINAL_MIXED],
      judgeTurns: () => ({
        text: JSON.stringify({
          verdicts: [
            { row: 0, verdict: 'partial', reason: 'half of the claim is on the line' },
            { row: 1, verdict: 'supported', reason: 'pinned constant' },
          ],
        }),
      }),
    });
    const outcome = (await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...AUDIT_BASE,
        citationAudit: {
          resolve: resolveSnapshot,
          judge: { model: 'judge:model' },
          onFound: 'fail',
        },
      }),
      undefined,
    )) as { citationAuditMeta?: Record<string, unknown> };
    expect(outcome.citationAuditMeta).toMatchObject({ partial: 1, unsupported: 0 });
  });

  it("'repair' rides the bounded round: one more composition, a fresh audit, lineage stamped", async () => {
    const rig = auditHarness({
      finals: [FINAL_MIXED, FINAL_REPAIRED],
      judgeTurns: (call) =>
        call === 1
          ? {
              text: JSON.stringify({
                verdicts: [
                  { row: 0, verdict: 'unsupported', reason: 'attribute policy, not absence' },
                  { row: 1, verdict: 'supported', reason: 'pinned constant' },
                ],
              }),
            }
          : {
              text: JSON.stringify({
                verdicts: [
                  { row: 0, verdict: 'supported', reason: 'now claims the policy itself' },
                  { row: 1, verdict: 'supported', reason: 'pinned constant' },
                ],
              }),
            },
    });
    const outcome = (await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...AUDIT_BASE,
        citationAudit: {
          resolve: resolveSnapshot,
          judge: { model: 'judge:model' },
          onFound: 'repair',
        },
      }),
      undefined,
    )) as {
      result?: unknown;
      citationAuditMeta?: Record<string, unknown>;
      repairs?: { semantic?: number };
    };
    expect(outcome.result).toBe(FINAL_REPAIRED);
    expect(rig.synthCalls()).toBe(2);
    expect(rig.judgeCalls()).toBe(2);
    expect(outcome.citationAuditMeta).toMatchObject({
      unsupported: 0,
      passes: 2,
      firstPassFindings: 1,
      citationRepairRounds: 1,
    });
    // The round is a dispatched semantic repair in the RV4002 ledger,
    // and since RV4105 it owns a row attributed at dispatch.
    expect(outcome.repairs?.semantic).toBe(1);
    const semanticRow = (
      outcome.repairs as { rounds?: Array<{ stage?: string; trigger?: string }> }
    ).rounds?.find((row) => row.stage === 'semantic');
    expect(semanticRow?.trigger).toBe('citation');
  });

  it('survivors after the round stop the run typed', async () => {
    const rig = auditHarness({
      finals: [FINAL_MIXED, FINAL_MIXED],
      judgeTurns: () => ({
        text: JSON.stringify({
          verdicts: [
            { row: 0, verdict: 'unsupported', reason: 'attribute policy, not absence' },
            { row: 1, verdict: 'supported', reason: 'pinned constant' },
          ],
        }),
      }),
    });
    await expect(
      executeWorkflow(
        rig.internals,
        makeOrchestratorWorkflow('audit the executor', {
          ...AUDIT_BASE,
          citationAudit: {
            resolve: resolveSnapshot,
            judge: { model: 'judge:model' },
            onFound: 'repair',
          },
        }),
        undefined,
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining('after the bounded repair round') as unknown,
      data: { source: 'orchestrator_citation_audit', repairsUsed: 1 },
    });
  });

  it('an unconfigured run keeps the envelope without the fields entirely', async () => {
    const rig = auditHarness({ finals: [FINAL_MIXED], judgeTurns: () => ({ text: '{}' }) });
    const outcome = (await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('audit the executor', AUDIT_BASE),
      undefined,
    )) as Record<string, unknown>;
    expect('citationAuditMeta' in outcome).toBe(false);
    expect('citationFindings' in outcome).toBe(false);
  });
});
