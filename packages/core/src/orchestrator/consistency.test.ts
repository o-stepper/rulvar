/**
 * The claim-consistency pairing fold, pure half (RV1501, the
 * eighteenth improvement plan). Reproduced on the seventeenth
 * comparison run at 1.157.0: the security child's own report read
 * `packages/executor/src/subprocess.ts:256-296` correctly (a failed
 * audit write does not mask success), and the ROOT inverted the claim
 * in the final draft while citing the very same span; every configured
 * check passed because each judged the draft alone, never against the
 * pool that contradicted it. These tests pin the narrow pairing rule
 * (a draft sentence citing an anchor pairs with the pool sentences
 * citing an intersecting span of the same file), its deliberate
 * non-pairs, and the bounds that keep the fold cheap.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError, FailRunError } from '../l0/errors.js';
import { criticalPathFromJournal } from '../stores/critical-path.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';

import {
  RUN_FACTS_ANCHOR,
  claimCoverageOf,
  pairDraftClaims,
  pairRunFactClaims,
} from './consistency.js';
import { makeOrchestratorWorkflow, sectionalRoundPlan } from './orchestrate.js';
import { minMatchesValidator } from './finish-validators.js';

describe('pairDraftClaims (RV1501)', () => {
  it('pairs a draft sentence with the pool sentence reading the same anchor differently', () => {
    const fold = pairDraftClaims(
      'Audit-write failure does not turn success into failure ' +
        '[packages/executor/src/subprocess.ts:256-296]. Unrelated prose follows.',
      [
        {
          nodeId: 'security',
          text:
            'The executor writes intent before dispatch; a failed audit write does not mask ' +
            'success (`packages/executor/src/subprocess.ts:256-296`).',
        },
      ],
    );
    expect(fold.truncated).toBe(false);
    expect(fold.draftCitingSentences).toBe(1);
    expect(fold.pairs).toEqual([
      {
        anchor: 'packages/executor/src/subprocess.ts:256-296',
        draftExcerpt:
          'Audit-write failure does not turn success into failure ' +
          '[packages/executor/src/subprocess.ts:256-296].',
        pool: [
          {
            nodeId: 'security',
            excerpt:
              'The executor writes intent before dispatch; a failed audit write does not mask ' +
              'success (`packages/executor/src/subprocess.ts:256-296`).',
          },
        ],
      },
    ]);
  });

  it('requires the spans to intersect: the same file with disjoint ranges never pairs', () => {
    const fold = pairDraftClaims(
      'The epilogue refuses silently unaudited effects [src/exec.ts:256-296].',
      [{ nodeId: 'a', text: 'The header replaces the environment (`src/exec.ts:1-19`).' }],
    );
    expect(fold.pairs).toEqual([]);
    expect(fold.draftCitingSentences).toBe(1);
  });

  it('pairs a single-line draft anchor inside a pool range, and the reverse', () => {
    const single = pairDraftClaims('The throw happens at `src/exec.ts:294` on failure.', [
      { nodeId: 'a', text: 'The settle epilogue runs on every path per `src/exec.ts:256-296`.' },
    ]);
    expect(single.pairs).toHaveLength(1);
    expect(single.pairs[0].anchor).toBe('src/exec.ts:294');
    const reverse = pairDraftClaims('The epilogue spans `src/exec.ts:256-296` entirely.', [
      { nodeId: 'a', text: 'A rejected record throws typed at `src/exec.ts:294` always.' },
    ]);
    expect(reverse.pairs).toHaveLength(1);
    expect(reverse.pairs[0].pool[0].excerpt).toContain('src/exec.ts:294');
  });

  it('drops verbatim agreement: a draft sentence containing the pool sentence is no pair', () => {
    const sentence = 'The retry default is 3 attempts (`src/retry.ts:33`).';
    expect(pairDraftClaims(sentence, [{ nodeId: 'a', text: sentence }]).pairs).toEqual([]);
    expect(
      pairDraftClaims(`As one child put it: ${sentence}`, [{ nodeId: 'a', text: sentence }]).pairs,
    ).toEqual([]);
  });

  it('collects pool readings across children in first-seen order, deduplicated and capped', () => {
    const fold = pairDraftClaims(
      'The cap is immutable after start [src/budget.ts:10-40].',
      [
        { nodeId: 'a', text: 'The cap tops up on resume, see `src/budget.ts:12`. ' },
        { nodeId: 'b', text: 'The cap tops up on resume, see `src/budget.ts:12`. ' },
        { nodeId: 'c', text: 'A resumed segment re-reads the cap from `src/budget.ts:15`.' },
        { nodeId: 'd', text: 'Nothing tops up B0, per `src/budget.ts:13`.' },
      ],
      { maxPoolPerPair: 3 },
    );
    expect(fold.pairs).toHaveLength(1);
    expect(fold.pairs[0].pool.map((reading) => reading.nodeId)).toEqual(['a', 'b', 'c']);
  });

  it('emits one pair per (draft sentence, anchor), so two cited anchors give two pairs', () => {
    const fold = pairDraftClaims('Both layers refuse on crossing [src/a.ts:5] [src/b.ts:9].', [
      { nodeId: 'a', text: 'Layer one warns instead of refusing at `src/a.ts:5`.' },
      { nodeId: 'b', text: 'Layer two logs only, per `src/b.ts:9`.' },
    ]);
    expect(fold.pairs.map((pair) => pair.anchor)).toEqual(['src/a.ts:5', 'src/b.ts:9']);
  });

  it('caps reported pairs at max and marks the truncation', () => {
    const draft = [1, 2, 3]
      .map((line) => `Claim number ${String(line)} holds [src/f.ts:${String(line)}].`)
      .join(' ');
    const pool = [1, 2, 3].map((line) => ({
      nodeId: `child-${String(line)}`,
      text: `Claim number ${String(line)} fails, see \`src/f.ts:${String(line)}\`.`,
    }));
    const fold = pairDraftClaims(draft, pool, { max: 2 });
    expect(fold.pairs).toHaveLength(2);
    expect(fold.truncated).toBe(true);
    const complete = pairDraftClaims(draft, pool, { max: 3 });
    expect(complete.truncated).toBe(false);
  });

  it('cuts excerpts to maxExcerptChars without changing pairing', () => {
    const fold = pairDraftClaims(
      `The long tail ${'x'.repeat(300)} ends here [src/t.ts:1].`,
      [{ nodeId: 'a', text: 'The tail is short, per `src/t.ts:1`.' }],
      { maxExcerptChars: 40 },
    );
    expect(fold.pairs[0].draftExcerpt).toHaveLength(40);
  });

  it('judges nothing without a citing draft sentence', () => {
    const fold = pairDraftClaims('No citations at all here.', [
      { nodeId: 'a', text: 'A pool claim with an anchor (`src/a.ts:1`).' },
    ]);
    expect(fold).toEqual({
      pairs: [],
      truncated: false,
      draftCitingSentences: 0,
      coveredCitingSentences: 0,
    });
  });

  it('skips anchors whose range is inverted instead of guessing', () => {
    const fold = pairDraftClaims('An inverted span [src/a.ts:9-3] asserts nothing.', [
      { nodeId: 'a', text: 'The line reads otherwise (`src/a.ts:5`).' },
    ]);
    expect(fold.pairs).toEqual([]);
    expect(fold.draftCitingSentences).toBe(0);
  });

  it('refuses a pattern that does not compile, fail closed', () => {
    expect(() => pairDraftClaims('text', [], { pattern: '(' })).toThrow(ConfigError);
  });

  it('refuses a pattern able to match the empty string, fail closed', () => {
    expect(() => pairDraftClaims('text', [], { pattern: '\\d*' })).toThrow(ConfigError);
  });

  it('refuses non positive bounds, fail closed', () => {
    expect(() => pairDraftClaims('text', [], { max: 0 })).toThrow(ConfigError);
    expect(() => pairDraftClaims('text', [], { maxExcerptChars: -1 })).toThrow(ConfigError);
    expect(() => pairDraftClaims('text', [], { maxPoolPerPair: 1.5 })).toThrow(ConfigError);
  });
});

describe('critical anchors and coverage (RV1603)', () => {
  const draftOf = (lines: string[]): string => lines.join(' ');
  const poolOf = (spans: string[]): { nodeId: string; text: string }[] =>
    spans.map((span, index) => ({
      nodeId: `child-${String(index)}`,
      text: `The recorded reading disagrees at \`${span}\`.`,
    }));

  it('critical pairs sort first, so the cap spends its budget on the declared claims', () => {
    const draft = draftOf([
      'Ordinary claim one holds [src/a.ts:1].',
      'Ordinary claim two holds [src/b.ts:2].',
      'The ledger claim holds [packages/executor/src/ledger.ts:7].',
    ]);
    const pool = poolOf(['src/a.ts:1', 'src/b.ts:2', 'packages/executor/src/ledger.ts:7']);
    const fold = pairDraftClaims(draft, pool, {
      max: 1,
      critical: ['packages/executor/src/ledger.ts'],
    });
    expect(fold.pairs.map((pair) => pair.anchor)).toEqual(['packages/executor/src/ledger.ts:7']);
    expect(fold.truncated).toBe(true);
    expect(fold.criticalUncovered).toEqual([]);
    expect(fold.criticalUncoveredTotal).toBe(0);
  });

  it('a span entry matches intersecting anchors only; a path entry matches the file and its directory', () => {
    const draft = draftOf([
      'Inside the span [src/exec.ts:260].',
      'Outside the span [src/exec.ts:400].',
      'Under the directory [packages/executor/src/deep/file.ts:3].',
    ]);
    const pool = poolOf([
      'src/exec.ts:260',
      'src/exec.ts:400',
      'packages/executor/src/deep/file.ts:3',
    ]);
    const fold = pairDraftClaims(draft, pool, {
      max: 2,
      critical: ['src/exec.ts:250-300', 'packages/executor'],
    });
    expect(fold.pairs.map((pair) => pair.anchor)).toEqual([
      'src/exec.ts:260',
      'packages/executor/src/deep/file.ts:3',
    ]);
  });

  it('names the critical draft anchors the judge never saw, capped with the total beside it', () => {
    const draft = draftOf([
      'The ledger claim has no pool reading [packages/executor/src/ledger.ts:7].',
      'The paired claim disagrees [src/a.ts:1].',
    ]);
    const fold = pairDraftClaims(draft, poolOf(['src/a.ts:1']), {
      critical: ['packages/executor/src/ledger.ts'],
    });
    expect(fold.pairs.map((pair) => pair.anchor)).toEqual(['src/a.ts:1']);
    expect(fold.criticalUncovered).toEqual(['packages/executor/src/ledger.ts:7']);
    expect(fold.criticalUncoveredTotal).toBe(1);
  });

  it('counts covered citing sentences honestly under the cap', () => {
    const draft = draftOf([
      'Claim one [src/f.ts:1].',
      'Claim two [src/f.ts:2].',
      'Claim three has no reading [src/none.ts:3].',
    ]);
    const fold = pairDraftClaims(draft, poolOf(['src/f.ts:1', 'src/f.ts:2']), { max: 1 });
    expect(fold.draftCitingSentences).toBe(3);
    expect(fold.coveredCitingSentences).toBe(1);
    expect(fold.truncated).toBe(true);
  });

  it('without critical the ordering is byte-identical to the historical draft order', () => {
    const draft = draftOf(['One [src/a.ts:1].', 'Two [src/b.ts:2].']);
    const pool = poolOf(['src/a.ts:1', 'src/b.ts:2']);
    const bare = pairDraftClaims(draft, pool);
    expect(bare.pairs.map((pair) => pair.anchor)).toEqual(['src/a.ts:1', 'src/b.ts:2']);
    expect(bare.criticalUncovered).toBeUndefined();
    expect(bare.criticalUncoveredTotal).toBeUndefined();
  });

  it('refuses an empty-string critical entry, fail closed', () => {
    expect(() => pairDraftClaims('text', [], { critical: [''] })).toThrow(ConfigError);
  });
});

describe('pairRunFactClaims (RV1603)', () => {
  const SHEET = {
    text:
      'The run made 125 provider wire requests across 6 accepted children. ' +
      'Recorded evidence entries per child: 23, 18, 22, 20, 20, 20.',
    ids: ['run-aug03', 'child-finops'],
    numbers: [125, 6, 23, 18, 22, 20],
  };

  it('pairs a sentence naming a recorded fact value, two digits or more', () => {
    const fold = pairRunFactClaims(
      'Each role recorded 18 to 20 evidence entries. Unrelated prose stays out.',
      SHEET,
    );
    expect(fold.pairs).toHaveLength(1);
    expect(fold.pairs[0]?.anchor).toBe(RUN_FACTS_ANCHOR);
    expect(fold.pairs[0]?.pool[0]?.nodeId).toBe(RUN_FACTS_ANCHOR);
    expect(fold.pairs[0]?.pool[0]?.excerpt).toContain('125 provider wire requests');
  });

  it('a single-digit fact value never triggers: prose sixes cannot flood the fold', () => {
    const fold = pairRunFactClaims('All 6 sections agree with each other.', SHEET);
    expect(fold.pairs).toEqual([]);
  });

  it('pairs a sentence naming a minted id', () => {
    const fold = pairRunFactClaims('The experiment with run id run-aug03 is cited here.', SHEET);
    expect(fold.pairs).toHaveLength(1);
  });

  it('pairs a sentence matching a caller term, case-insensitive', () => {
    const fold = pairRunFactClaims(
      'Real models were NOT RUN in this exercise.',
      { text: 'The run made 125 wire requests.', ids: [], numbers: [125] },
      { terms: ['not run'] },
    );
    expect(fold.pairs).toHaveLength(1);
  });

  it('caps pairs at max and marks the truncation', () => {
    const draft = ['One claim about 125 wires.', 'Another about 125 wires too.'].join(' ');
    const fold = pairRunFactClaims(draft, SHEET, { max: 1 });
    expect(fold.pairs).toHaveLength(1);
    expect(fold.truncated).toBe(true);
  });

  it('refuses empty terms and non positive bounds, fail closed', () => {
    expect(() => pairRunFactClaims('text', SHEET, { terms: [''] })).toThrow(ConfigError);
    expect(() => pairRunFactClaims('text', SHEET, { max: 0 })).toThrow(ConfigError);
  });
});

const PROFILES = { worker: { description: 'reads one span' } };

const POOL_READING = 'A failed audit write does not mask success (`src/exec.ts:256-296`).';
const DRAFT_INVERTED =
  'draft: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';
const DRAFT_PLAIN = 'draft: nothing cited here.';

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

/** Spawns one worker per child text, awaits all, finishes with the draft. */
function rootAdapter(children: readonly string[], draft: string) {
  let orchTurn = 0;
  return scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      const prompt = textOf(req);
      const index = Number(prompt.slice(prompt.lastIndexOf('read ') + 5).trim());
      return { text: children[index] ?? '' };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCalls: children.map((_, index) => ({
          name: 'spawn_agent',
          args: { agentType: 'worker', prompt: `read ${String(index)}` },
        })),
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: draft } } };
  });
}

const JUDGE_FINDS: ScriptedTurn = {
  text: JSON.stringify({
    contradictions: [{ pair: 0, reason: 'the draft inverts the recorded reading' }],
  }),
};
const JUDGE_AGREES: ScriptedTurn = { text: JSON.stringify({ contradictions: [] }) };

function passHarness(options: {
  children: readonly string[];
  draft: string;
  judgeTurn?: ScriptedTurn;
}) {
  const coordination = rootAdapter(options.children, options.draft);
  const judge = scriptedAdapter((): ScriptedTurn => options.judgeTurn ?? JUDGE_FINDS, {
    id: 'judge',
  });
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'final text' } } }),
    { id: 'strong' },
  );
  const { internals, events } = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { internals, events, coordination, judge, synthesis };
}

const JUDGE_MODEL = { judge: { model: 'judge:model' as const } };

describe('the claim-consistency pass wired into the orchestrator (RV1501, RV1502)', () => {
  it('judges the paired draft claims and reports the findings on the envelope', async () => {
    const { internals, events, judge } = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { ...JUDGE_MODEL },
      }),
      undefined,
    )) as {
      claimContradictions?: {
        anchor: string;
        draftExcerpt: string;
        pool: { nodeId: string; excerpt: string }[];
        reason: string;
      }[];
      claimConsistencyMeta?: Record<string, unknown>;
    };
    expect(outcome.claimContradictions).toHaveLength(1);
    const finding = outcome.claimContradictions?.[0];
    expect(finding?.anchor).toBe('src/exec.ts:256-296');
    expect(finding?.draftExcerpt).toBe(DRAFT_INVERTED.replace('draft: ', 'draft: '));
    expect(finding?.pool[0]?.excerpt).toBe(POOL_READING);
    expect(finding?.reason).toBe('the draft inverts the recorded reading');
    // The verdict says WHICH document it read (RV2509); the hash is
    // read back typed so the exact-shape assertion stays exact.
    const judgedHash = (outcome.claimConsistencyMeta as { judgedHash?: unknown } | undefined)
      ?.judgedHash;
    expect(judgedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(outcome.claimConsistencyMeta).toEqual({
      poolChildren: 1,
      draftCitingSentences: 1,
      pairs: 1,
      truncated: false,
      coveredCitingSentences: 1,
      judgeInvoked: true,
      // The count rides the meta (RV3304): surfaces the findings array
      // never reaches still say what the judge found.
      findings: 1,
      coverage: 'full',
      judgedStage: 'draft',
      judgedHash,
      // The precise twin (RV4604): same hex, the name states JCS sha256.
      judgedJcsSha256: judgedHash,
    });
    // Exactly one judge invocation, carrying the pairs it must rule on.
    expect(judge.calls).toHaveLength(1);
    const judgePrompt = judge.calls[0] === undefined ? '' : textOf(judge.calls[0]);
    expect(judgePrompt).toContain('PAIRS:');
    expect(judgePrompt).toContain('src/exec.ts:256-296');
    const log = events
      .ofType('log')
      .find(
        (event) => (event as { msg?: string }).msg === 'orchestrator claim consistency pass',
      ) as { data?: { findings?: number; judgeInvoked?: boolean } } | undefined;
    expect(log?.data?.findings).toBe(1);
    expect(log?.data?.judgeInvoked).toBe(true);
  });

  it('never invokes the judge when the fold pairs nothing', async () => {
    const { internals, judge } = passHarness({
      children: ['No citations in this child.'],
      draft: DRAFT_PLAIN,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { ...JUDGE_MODEL },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect(judge.calls).toHaveLength(0);
    expect(outcome.claimContradictions).toEqual([]);
    const vacuousHash = (outcome.claimConsistencyMeta as { judgedHash?: unknown } | undefined)
      ?.judgedHash;
    expect(vacuousHash).toMatch(/^[0-9a-f]{64}$/);
    expect(outcome.claimConsistencyMeta).toEqual({
      poolChildren: 1,
      draftCitingSentences: 0,
      pairs: 0,
      truncated: false,
      coveredCitingSentences: 0,
      judgeInvoked: false,
      // Not 'full' (RV2508): this configured pass verified nothing,
      // and the zero denominator is exactly what the grade must say.
      coverage: 'vacuous',
      judgedStage: 'draft',
      judgedHash: vacuousHash,
      judgedJcsSha256: vacuousHash,
    });
  });

  it('reports an empty finding list when the judge clears every pair', async () => {
    const { internals } = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { ...JUDGE_MODEL },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect(outcome.claimContradictions).toEqual([]);
    expect(outcome.claimConsistencyMeta).toMatchObject({ pairs: 1, judgeInvoked: true });
  });

  it('an unconfigured pass leaves the envelope without the fields entirely', async () => {
    const { internals } = passHarness({ children: [POOL_READING], draft: DRAFT_INVERTED });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect('claimContradictions' in outcome).toBe(false);
    expect('claimConsistencyMeta' in outcome).toBe(false);
  });

  it('carries the findings into the synthesis prompt and blocks the valid-draft skip', async () => {
    const { internals, synthesis } = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        finishValidation: { validators: [{ name: 'always-ok', validate: () => ({ ok: true }) }] },
        synthesis: { skipWhenDraftValid: true },
        claimConsistency: { onFound: 'carry', ...JUDGE_MODEL },
      }),
      undefined,
    )) as { synthesisSkipped?: string };
    expect(synthesis.calls).toHaveLength(1);
    const prompt = synthesis.calls[0] === undefined ? '' : textOf(synthesis.calls[0]);
    expect(prompt).toContain('CLAIM CONTRADICTIONS:');
    expect(prompt).toContain('the draft inverts the recorded reading');
    expect(outcome.synthesisSkipped).toBeUndefined();
  });

  it("a clean verdict keeps the valid-draft skip and the prompt bytes under 'carry'", async () => {
    const carried = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
      judgeTurn: JUDGE_AGREES,
    });
    const carriedOutcome = (await executeWorkflow(
      carried.internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        finishValidation: { validators: [{ name: 'always-ok', validate: () => ({ ok: true }) }] },
        synthesis: { skipWhenDraftValid: true },
        claimConsistency: { onFound: 'carry', ...JUDGE_MODEL },
      }),
      undefined,
    )) as { synthesisSkipped?: string };
    expect(carried.synthesis.calls).toHaveLength(0);
    expect(carriedOutcome.synthesisSkipped).toBe('synthesis_skipped_by_valid_draft');
  });

  it('fails the run typed BEFORE any synthesis dispatch, after paying only the judge', async () => {
    const { internals, judge, synthesis } = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: {},
        claimConsistency: { onFound: 'fail', ...JUDGE_MODEL },
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.claimContradictions).toHaveLength(1);
    expect(data.completion).toBe('complete');
    expect(judge.calls).toHaveLength(1);
    expect(synthesis.calls).toHaveLength(0);
  });

  it('a dead judge is named honestly, and fails the run only under the fail posture', async () => {
    const dead: ScriptedTurn = { error: { code: 'agent', message: 'boom', retryable: false } };
    const reported = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
      judgeTurn: dead,
    });
    const outcome = (await executeWorkflow(
      reported.internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { ...JUDGE_MODEL },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect('claimContradictions' in outcome).toBe(false);
    expect(outcome.claimConsistencyMeta).toMatchObject({
      pairs: 1,
      judgeInvoked: true,
      judgeFailed: true,
      coverage: 'judge-failed',
    });

    const failing = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
      judgeTurn: dead,
    });
    const thrown = await executeWorkflow(
      failing.internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { onFound: 'fail', ...JUDGE_MODEL },
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(((thrown as FailRunError).data as Record<string, unknown>).source).toBe(
      'orchestrator_claim_consistency',
    );
  });

  it('replays the judge verdict on resume with zero adapter calls', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const defaults = {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' } as const,
      profiles: PROFILES,
    };
    const wfOpts = {
      acceptance: { childPolicy: 'all-ok' as const },
      claimConsistency: { ...JUDGE_MODEL },
    };
    const firstJudge = scriptedAdapter((): ScriptedTurn => JUDGE_FINDS, { id: 'judge' });
    const engineA = createEngine({
      adapters: [rootAdapter([POOL_READING], DRAFT_INVERTED), firstJudge],
      stores: { journal: store, transcripts },
      defaults,
    });
    const first = await engineA.run(
      makeOrchestratorWorkflow('audit the executor', wfOpts),
      undefined,
      { runId: 'CLAIMS' },
    ).result;
    expect(first.status).toBe('ok');
    expect(firstJudge.calls).toHaveLength(1);

    const replayRoot = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const replayJudge = scriptedAdapter((): ScriptedTurn => JUDGE_FINDS, { id: 'judge' });
    const engineB = createEngine({
      adapters: [replayRoot, replayJudge],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume(
      'CLAIMS',
      makeOrchestratorWorkflow('audit the executor', wfOpts),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(replayRoot.calls).toHaveLength(0);
    expect(replayJudge.calls).toHaveLength(0);
    expect((resumed.value as Record<string, unknown>).claimContradictions).toEqual(
      (first.value as Record<string, unknown>).claimContradictions,
    );
  });

  it('refuses bad intake, fail closed', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', { claimConsistency: { onFound: 'carry' } }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        synthesis: { mode: 'incremental' },
        claimConsistency: { onFound: 'carry' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { onFound: 'warn' as unknown as 'report' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', { claimConsistency: { pattern: '\\d*' } }),
    ).toThrow(ConfigError);
    expect(() => makeOrchestratorWorkflow('goal', { claimConsistency: { max: 0 } })).toThrow(
      ConfigError,
    );
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { judge: { effort: 'euphoric' as unknown as 'high' } },
      }),
    ).toThrow(ConfigError);
  });
});

describe('critical coverage and run-facts grounding wired into the orchestrator (RV1603)', () => {
  const RUN_CLAIM = 'Real models were not run here at all.';

  it('pairs a run claim with the fact sheet and maps the finding back to (run-facts)', async () => {
    const { internals, judge } = passHarness({
      children: [POOL_READING],
      draft: `${DRAFT_INVERTED} ${RUN_CLAIM}`,
      judgeTurn: {
        text: JSON.stringify({
          contradictions: [{ pair: 1, reason: 'the run recorded wire requests' }],
        }),
      },
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { runFacts: true, runFactTerms: ['not run'], ...JUDGE_MODEL },
      }),
      undefined,
    )) as {
      claimContradictions?: { anchor: string; reason: string }[];
      claimConsistencyMeta?: Record<string, unknown>;
    };
    expect(outcome.claimContradictions).toHaveLength(1);
    expect(outcome.claimContradictions?.[0]?.anchor).toBe(RUN_FACTS_ANCHOR);
    expect(outcome.claimContradictions?.[0]?.reason).toBe('the run recorded wire requests');
    expect(outcome.claimConsistencyMeta).toMatchObject({
      pairs: 2,
      runFactPairs: 1,
      coveredCitingSentences: 1,
      judgeInvoked: true,
    });
    const judgePrompt = judge.calls[0] === undefined ? '' : textOf(judge.calls[0]);
    expect(judgePrompt).toContain('(run-facts)');
    expect(judgePrompt).toContain('recorded execution facts');
  });

  it('adds no run-facts prompt bytes when nothing in the draft speaks about the run', async () => {
    const { internals, judge } = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { runFacts: true, runFactTerms: ['not run'], ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    expect(outcome.claimConsistencyMeta).toMatchObject({ pairs: 1, runFactPairs: 0 });
    const judgePrompt = judge.calls[0] === undefined ? '' : textOf(judge.calls[0]);
    expect(judgePrompt).not.toContain('recorded execution facts');
  });

  it('reports the critical draft anchors the judge never saw', async () => {
    const { internals, judge } = passHarness({
      children: ['No citations in this child.'],
      draft: 'The ledger claim holds [packages/never/read.ts:7].',
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { critical: ['packages/never/read.ts'], ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    expect(judge.calls).toHaveLength(0);
    expect(outcome.claimConsistencyMeta).toMatchObject({
      pairs: 0,
      criticalUncovered: ['packages/never/read.ts:7'],
      criticalUncoveredTotal: 1,
      judgeInvoked: false,
      coverage: 'critical-uncovered',
    });
  });

  it('the armed onUncoveredCritical posture fails typed BEFORE the judge dispatch', async () => {
    const { internals, judge } = passHarness({
      children: ['No citations in this child.'],
      draft: 'The ledger claim holds [packages/never/read.ts:7].',
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: {
          critical: ['packages/never/read.ts'],
          onUncoveredCritical: 'fail',
          ...JUDGE_MODEL,
        },
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.criticalUncovered).toEqual(['packages/never/read.ts:7']);
    expect(judge.calls).toHaveLength(0);
  });

  it('refuses bad RV1603 intake, fail closed', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { runFactTerms: ['x'] },
      }),
    ).toThrow(/runFactTerms rides the runFacts pass/);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { onUncoveredCritical: 'fail' },
      }),
    ).toThrow(/needs critical anchors/);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { critical: [''] },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { runFacts: 'yes' as unknown as boolean },
      }),
    ).toThrow(/runFacts/);
  });
});

describe('the declined judge admission degrades typed (RV2106, the ninth parity run)', () => {
  // The ninth parity run: four ok children, a composed and accepted
  // draft, and the claim judge's 0.28 estimate refused against the
  // orchestrator account's working room past the held synthesis
  // reserve; the bare refusal killed the run with the synthesis its
  // reserve was funding never dispatched. The refusal now journals its
  // verdict, the meta names the declined pass, and the synthesis runs.
  function declinedHarness() {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const judge = scriptedAdapter((): ScriptedTurn => JUDGE_FINDS, { id: 'judge' });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'final text' } } }),
      { id: 'strong' },
    );
    return makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: { worker: { description: 'reads one span', estCost: 0.001 } },
      budgetUsd: 0.5,
    });
  }
  const DECLINED_OPTS = {
    acceptance: { childPolicy: 'all-ok' as const },
    // Working room past the hold: 0.06 - 0.05 = 0.01; the judge's
    // 0.02 estimate cannot seat once the coordination turns spent.
    budget: { capUsd: 0.06, capFraction: 1.0, synthesisReserveUsd: 0.05 },
    synthesis: { limits: { maxTurns: 2 }, estCost: 0.005 },
  };

  it('journals the declined verdict, names the meta, and still dispatches the synthesis', async () => {
    const { internals, store, events } = declinedHarness();
    const wf = makeOrchestratorWorkflow('audit the executor', {
      ...DECLINED_OPTS,
      claimConsistency: { judge: { model: 'judge:model', estCost: 0.02 } },
    });
    const envelope = (await executeWorkflow(internals, wf, undefined)) as {
      claimContradictions?: unknown[];
      claimConsistencyMeta?: { judgeInvoked?: boolean; judgeDeclined?: boolean };
    };
    // The synthesis its reserve was funding DID dispatch.
    expect(envelope).toMatchObject({});
    const meta = envelope.claimConsistencyMeta;
    expect(meta?.judgeInvoked).toBe(false);
    expect(meta?.judgeDeclined).toBe(true);
    await internals.replayer.flush();
    const entries = await store.load('test-run');
    const declined = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_claim_judge_declined',
    );
    const value = declined?.value as { reason?: string; remainingUsd?: number } | undefined;
    expect(value).toBeDefined();
    // The refusal's own arithmetic, the held reserve named (RV2106).
    expect(String(value?.reason ?? '')).toContain('held synthesis reserve 0.0500');
    expect(typeof value?.remainingUsd).toBe('number');
    // The synthesis agent settled ok with the final text.
    const synthesized = entries.find(
      (entry) => entry.kind === 'agent' && entry.status === 'ok' && entry.value === 'final text',
    );
    expect(synthesized).toBeDefined();
    const warn = events
      .ofType('log')
      .find(
        (event) =>
          (event as { msg?: string }).msg ===
          'orchestrator claim consistency judge declined by admission',
      );
    expect(warn).toBeDefined();
  });

  it("the armed 'fail' posture cannot pass a draft its judge could not be seated for", async () => {
    const { internals } = declinedHarness();
    const wf = makeOrchestratorWorkflow('audit the executor', {
      ...DECLINED_OPTS,
      claimConsistency: { onFound: 'fail', judge: { model: 'judge:model', estCost: 0.02 } },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as Error).message)).toContain('could not be admitted');
  });
});

describe('the claim-coverage grade (RV1702)', () => {
  it('derives the closed vocabulary with judge-failed strongest, then critical, then partial', () => {
    const base = { draftCitingSentences: 4, truncated: false, coveredCitingSentences: 4 };
    expect(claimCoverageOf(base)).toBe('full');
    expect(claimCoverageOf({ ...base, truncated: true })).toBe('partial');
    expect(claimCoverageOf({ ...base, coveredCitingSentences: 3 })).toBe('partial');
    expect(claimCoverageOf({ ...base, runFactPairsTruncated: true })).toBe('partial');
    expect(claimCoverageOf({ ...base, criticalUncoveredTotal: 1 })).toBe('critical-uncovered');
    expect(claimCoverageOf({ ...base, truncated: true, criticalUncoveredTotal: 2 })).toBe(
      'critical-uncovered',
    );
    expect(claimCoverageOf({ ...base, criticalUncoveredTotal: 2, judgeFailed: true })).toBe(
      'judge-failed',
    );
    expect(claimCoverageOf({ ...base, criticalUncoveredTotal: 0 })).toBe('full');
  });

  it('a declined judge and a zero denominator get their own words (RV2508)', () => {
    const base = { draftCitingSentences: 4, truncated: false, coveredCitingSentences: 4 };
    // A judge refused ADMISSION never dispatched (RV2106), so nothing
    // was judged: the flag outranks everything the counts could say,
    // because those counts describe a pass that did not happen.
    expect(claimCoverageOf({ ...base, judgeDeclined: true })).toBe('judge-declined');
    expect(claimCoverageOf({ ...base, truncated: true, judgeDeclined: true })).toBe(
      'judge-declined',
    );
    expect(claimCoverageOf({ ...base, criticalUncoveredTotal: 2, judgeDeclined: true })).toBe(
      'judge-declined',
    );
    // A failed invocation still outranks a declined one: the two causes
    // are worth telling apart, and a failure at least had an
    // invocation to fail.
    expect(claimCoverageOf({ ...base, judgeDeclined: true, judgeFailed: true })).toBe(
      'judge-failed',
    );
    // The zero denominator is its own word, not the strongest one.
    const empty = { draftCitingSentences: 0, truncated: false, coveredCitingSentences: 0 };
    expect(claimCoverageOf(empty)).toBe('vacuous');
    // It stays below every stronger reading of the same meta.
    expect(claimCoverageOf({ ...empty, criticalUncoveredTotal: 1 })).toBe('critical-uncovered');
    expect(claimCoverageOf({ ...empty, truncated: true })).toBe('partial');
    expect(claimCoverageOf({ ...empty, judgeDeclined: true })).toBe('judge-declined');
    expect(claimCoverageOf({ ...empty, judgeFailed: true })).toBe('judge-failed');
  });

  it('a bounded pass grades the envelope partial, in counts and in name', async () => {
    const twoCites =
      'draft: the audit failure masks success (`src/exec.ts:256-296`). ' +
      'draft: the retry path rejects masked writes (`src/exec.ts:260-280`).';
    const { internals, judge } = passHarness({
      children: [POOL_READING],
      draft: twoCites,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { max: 1, ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    expect(judge.calls).toHaveLength(1);
    expect(outcome.claimConsistencyMeta).toMatchObject({
      draftCitingSentences: 2,
      pairs: 1,
      truncated: true,
      coveredCitingSentences: 1,
      judgeInvoked: true,
      coverage: 'partial',
    });
  });
});

describe('the declared coverage floors (RV1809)', () => {
  const TWO_SENTENCE_DRAFT =
    'The exec path masks nothing (src/exec.ts:10). The ledger dedupes keys (src/ledger.ts:5).';
  const EXEC_ONLY_POOL = 'The exec path is honest about masking (src/exec.ts:10).';

  it('pairRunFactClaims reports the uncapped candidate count', () => {
    const sheet = { text: 'The run made 125 wire requests.', ids: [], numbers: [125] };
    const draft = ['One claim about 125 wires.', 'Another about 125 wires too.'].join(' ');
    const fold = pairRunFactClaims(draft, sheet, { max: 1 });
    expect(fold.pairs).toHaveLength(1);
    expect(fold.truncated).toBe(true);
    expect(fold.candidates).toBe(2);
  });

  it("a below-floor pass under 'report' stamps the machine-readable lowCoverage block", async () => {
    const { internals } = passHarness({
      children: [EXEC_ONLY_POOL],
      draft: TWO_SENTENCE_DRAFT,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { minimumCoverageRatio: 0.8, ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    const meta = outcome.claimConsistencyMeta;
    expect(meta?.coverage).toBe('partial');
    expect(meta?.lowCoverage).toEqual({ coverageRatio: 0.5, coverageFloor: 0.8 });
    // The candidates field rides the meta under runFacts only; this
    // run declared none, so the block stays exactly this shape.
    expect(meta !== undefined && 'runFactCandidates' in meta).toBe(false);
  });

  it('the armed onLowCoverage posture fails typed BEFORE the judge dispatch', async () => {
    const { internals, judge } = passHarness({
      children: [EXEC_ONLY_POOL],
      draft: TWO_SENTENCE_DRAFT,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: {
          minimumCoverageRatio: 0.8,
          onLowCoverage: 'fail',
          ...JUDGE_MODEL,
        },
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.lowCoverage).toEqual({ coverageRatio: 0.5, coverageFloor: 0.8 });
    expect(judge.calls).toHaveLength(0);
  });

  it('a meeting pass stamps no block and keeps its exact bytes', async () => {
    const { internals } = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { minimumCoverageRatio: 0.5, ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    const meta = outcome.claimConsistencyMeta;
    expect(meta?.coverage).toBe('full');
    expect(meta !== undefined && 'lowCoverage' in meta).toBe(false);
  });

  it('refuses bad RV1809 intake, fail closed', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { minimumCoverageRatio: 0 },
      }),
    ).toThrow(/minimumCoverageRatio must be a number in \(0, 1\]/);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { minimumCoverageRatio: 1.2 },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { runFactCoverageRatio: 0.5 },
      }),
    ).toThrow(/runFactCoverageRatio rides the runFacts pass/);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { onLowCoverage: 'fail' },
      }),
    ).toThrow(/needs a declared floor/);
  });
});

describe('the semantic gate reaches the FINAL artifact (RV2509)', () => {
  // The pass has always read the coordination draft, before the
  // synthesis. That ordering is right (a bad draft must not pay for a
  // composition) and it cannot verify the document that shipped: the
  // twenty-fifth comparison run's judge cleared a draft the synthesis
  // then rewrote three times over.
  const FINAL_INVERTED =
    'final: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';

  function stageHarness(finalText: string) {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const judge = scriptedAdapter((): ScriptedTurn => JUDGE_AGREES, { id: 'judge' });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: finalText } } }),
      { id: 'strong' },
    );
    const { internals, events } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    return { internals, events, judge };
  }
  const run = async (stage: 'draft' | 'final' | 'both' | undefined, finalText = FINAL_INVERTED) => {
    const { internals, judge } = stageHarness(finalText);
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { ...JUDGE_MODEL, ...(stage === undefined ? {} : { stage }) },
      }),
      undefined,
    )) as {
      claimConsistencyMeta?: Record<string, unknown>;
      claimConsistencyDraftMeta?: Record<string, unknown>;
      draftToFinal?: {
        draftHash: string;
        finalHash: string;
        rewritten: boolean;
        claimsJudgedOn?: string;
      };
    };
    return { outcome, judgeCalls: judge.calls.length };
  };

  it('the default judges the draft and SAYS so beside a rewritten final', async () => {
    const { outcome, judgeCalls } = await run(undefined);
    expect(judgeCalls).toBe(1);
    expect(outcome.claimConsistencyMeta?.judgedStage).toBe('draft');
    // The reading that used to be impossible: this verdict is about a
    // document the synthesis replaced.
    expect(outcome.draftToFinal?.rewritten).toBe(true);
    expect(outcome.draftToFinal?.claimsJudgedOn).toBe('draft');
    expect(outcome.claimConsistencyMeta?.judgedHash).toBe(outcome.draftToFinal?.draftHash);
    expect(outcome.claimConsistencyMeta?.judgedHash).not.toBe(outcome.draftToFinal?.finalHash);
    expect(outcome.claimConsistencyDraftMeta).toBeUndefined();
  });

  it("'final' judges the shipped artifact, once", async () => {
    const { outcome, judgeCalls } = await run('final');
    expect(judgeCalls).toBe(1);
    expect(outcome.claimConsistencyMeta?.judgedStage).toBe('final');
    expect(outcome.claimConsistencyMeta?.judgedHash).toBe(outcome.draftToFinal?.finalHash);
    expect(outcome.draftToFinal?.claimsJudgedOn).toBe('final');
  });

  it("'both' keeps the pre-synthesis gate and reports the final on the headline meta", async () => {
    const { outcome, judgeCalls } = await run('both');
    expect(judgeCalls).toBe(2);
    expect(outcome.claimConsistencyMeta?.judgedStage).toBe('final');
    expect(outcome.claimConsistencyMeta?.judgedHash).toBe(outcome.draftToFinal?.finalHash);
    expect(outcome.claimConsistencyDraftMeta?.judgedStage).toBe('draft');
    expect(outcome.claimConsistencyDraftMeta?.judgedHash).toBe(outcome.draftToFinal?.draftHash);
  });

  it('a synthesis that returns the draft unchanged reports rewritten false', async () => {
    const { outcome } = await run(undefined, DRAFT_INVERTED);
    expect(outcome.draftToFinal?.rewritten).toBe(false);
    expect(outcome.draftToFinal?.draftHash).toBe(outcome.draftToFinal?.finalHash);
  });

  it('rejects an unknown stage, and a post-draft stage without a synthesis', () => {
    expect(() =>
      makeOrchestratorWorkflow('audit', {
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'shipped' as unknown as 'final' },
      }),
    ).toThrow(/stage must be 'draft', 'final' or 'both'/);
    expect(() =>
      makeOrchestratorWorkflow('audit', {
        claimConsistency: { stage: 'final' },
      }),
    ).toThrow(/stage 'final' requires synthesis/);
  });

  it("rejects 'carry' on the final stage and keeps it on 'both' (RV3301)", () => {
    // The 2026-08-12 comparison run: `stage: 'final'` with
    // `onFound: 'carry'` passed intake, the final judge named a real
    // contradiction, and the run still settled ok/complete, because
    // the carry's prompt had already been built and consumed. The
    // pair now refuses before any wire instead of reading as a gate
    // while behaving as 'report'.
    expect(() =>
      makeOrchestratorWorkflow('audit', {
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'final', onFound: 'carry' },
      }),
    ).toThrow(/'carry' cannot pair with stage 'final'/);
    expect(() =>
      makeOrchestratorWorkflow('audit', {
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'both', onFound: 'carry' },
      }),
    ).not.toThrow();
  });
});

describe('the declared coverage target sizes the pass (RV2903)', () => {
  // Four citing sentences, two anchors each: eight candidates against a
  // pool that reads every anchor differently. The ninth comparison run
  // covered 43 of 115 citing sentences because nothing sized the
  // selection to a goal: the first-max pairs spent depth on early
  // sentences while later ones went unjudged.
  const WIDE_DRAFT = [1, 2, 3, 4]
    .map(
      (index) =>
        `Claim ${String(index)} holds on both layers ` +
        `[src/a.ts:${String(index)}] [src/b.ts:${String(index)}].`,
    )
    .join(' ');
  const WIDE_POOL = [
    {
      nodeId: 'reader',
      text: [1, 2, 3, 4]
        .map(
          (index) =>
            `Layer a disagrees at line ${String(index)} (src/a.ts:${String(index)}). ` +
            `Layer b disagrees at line ${String(index)} (src/b.ts:${String(index)}).`,
        )
        .join(' '),
    },
  ];

  it('selects coverage-first: one pair per uncovered sentence until the target', () => {
    const blind = pairDraftClaims(WIDE_DRAFT, WIDE_POOL, { max: 4 });
    expect(blind.pairs).toHaveLength(4);
    expect(blind.coveredCitingSentences).toBe(2);
    expect(blind.truncated).toBe(true);

    const sized = pairDraftClaims(WIDE_DRAFT, WIDE_POOL, { max: 4, targetCoverageShare: 1 });
    expect(sized.pairs).toHaveLength(4);
    expect(sized.coveredCitingSentences).toBe(4);
    expect(sized.targetCoveredSentences).toBe(4);
    // The same budget bought double the coverage, and nothing was cut:
    // the leftover depth pairs were skipped, not truncated.
    expect(sized.truncated).toBe(false);
  });

  it('a met target stops the selection instead of spending the whole ceiling', () => {
    const fold = pairDraftClaims(WIDE_DRAFT, WIDE_POOL, { max: 8, targetCoverageShare: 0.5 });
    expect(fold.targetCoveredSentences).toBe(2);
    expect(fold.pairs).toHaveLength(2);
    expect(fold.coveredCitingSentences).toBe(2);
    expect(fold.truncated).toBe(false);
  });

  it('the hard ceiling still cuts, and THAT is what truncated means under a target', () => {
    const fold = pairDraftClaims(WIDE_DRAFT, WIDE_POOL, { max: 3, targetCoverageShare: 1 });
    expect(fold.pairs).toHaveLength(3);
    expect(fold.coveredCitingSentences).toBe(3);
    expect(fold.truncated).toBe(true);
  });

  it('critical candidates ride ahead of the target arithmetic', () => {
    const fold = pairDraftClaims(WIDE_DRAFT, WIDE_POOL, {
      max: 8,
      targetCoverageShare: 0.5,
      critical: ['src/b.ts:3'],
    });
    expect(fold.pairs[0]?.anchor).toBe('src/b.ts:3');
    expect(fold.coveredCitingSentences).toBe(2);
    expect(fold.criticalUncoveredTotal).toBe(0);
  });

  it('refuses a target outside (0, 1], fail closed', () => {
    expect(() => pairDraftClaims('x', [], { targetCoverageShare: 0 })).toThrow(ConfigError);
    expect(() => pairDraftClaims('x', [], { targetCoverageShare: 1.5 })).toThrow(ConfigError);
    expect(() => pairDraftClaims('x', [], { targetCoverageShare: Number.NaN })).toThrow(
      ConfigError,
    );
  });

  it('sizes the wired pass and echoes the target on the meta', async () => {
    const { internals } = passHarness({
      children: WIDE_POOL.map((row) => row.text),
      draft: WIDE_DRAFT,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the layers', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { max: 4, coverageTarget: 1, ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    const meta = outcome.claimConsistencyMeta;
    expect(meta).toMatchObject({
      pairs: 4,
      coveredCitingSentences: 4,
      coverageTarget: 1,
      truncated: false,
      coverage: 'full',
    });
    expect(meta !== undefined && 'lowCoverage' in meta).toBe(false);
  });

  it('an unreachable target trips the IMPLIED floor through the RV1809 machinery', async () => {
    const { internals } = passHarness({
      children: WIDE_POOL.map((row) => row.text),
      draft: WIDE_DRAFT,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the layers', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { max: 2, coverageTarget: 1, ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    const meta = outcome.claimConsistencyMeta;
    // The same number that sized the pass judges what it reached: no
    // separate minimumCoverageRatio was declared anywhere.
    expect(meta?.lowCoverage).toEqual({ coverageRatio: 0.5, coverageFloor: 1 });
    // RV4404: a truncation under the declared target now names the
    // ceiling as the cause instead of a generic 'partial'.
    expect(meta).toMatchObject({ coverageTarget: 1, truncated: true, coverage: 'coverage-capped' });
  });

  it('under a target the run-fact pass judges every matched candidate', async () => {
    const runClaims = Array.from(
      { length: 9 },
      (_, index) => `Scenario ${String(index + 1)} says real models were not run.`,
    ).join(' ');
    const wf = (consistency: Record<string, unknown>) =>
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: {
          runFacts: true,
          runFactTerms: ['not run'],
          ...consistency,
          ...JUDGE_MODEL,
        },
      });
    const blind = passHarness({
      children: [POOL_READING],
      draft: `${DRAFT_INVERTED} ${runClaims}`,
      judgeTurn: JUDGE_AGREES,
    });
    const blindOutcome = (await executeWorkflow(blind.internals, wf({}), undefined)) as {
      claimConsistencyMeta?: Record<string, unknown>;
    };
    expect(blindOutcome.claimConsistencyMeta).toMatchObject({
      runFactPairs: 8,
      runFactPairsTruncated: true,
      runFactCandidates: 9,
    });

    const sized = passHarness({
      children: [POOL_READING],
      draft: `${DRAFT_INVERTED} ${runClaims}`,
      judgeTurn: JUDGE_AGREES,
    });
    const sizedOutcome = (await executeWorkflow(
      sized.internals,
      wf({ coverageTarget: 1 }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    const meta = sizedOutcome.claimConsistencyMeta;
    expect(meta).toMatchObject({ runFactPairs: 9, runFactCandidates: 9 });
    expect(meta !== undefined && 'runFactPairsTruncated' in meta).toBe(false);
  });

  it('onLowCoverage accepts the target as its declared floor', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { coverageTarget: 0.9, onLowCoverage: 'fail' },
      }),
    ).not.toThrow();
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        claimConsistency: { coverageTarget: 1.5 },
      }),
    ).toThrow(ConfigError);
  });
});

describe('the bounded post judge repair (RV3307)', () => {
  const FINAL_INVERTED =
    'final: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';
  const FINAL_CLEAN = 'final: a failed audit write does not mask success [src/exec.ts:256-296].';

  function repairHarness(options: { judgeTurns: ScriptedTurn[]; finals: string[] }) {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
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
          args: {
            result: options.finals[Math.min(synthCall++, options.finals.length - 1)],
          },
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

  const REPAIR_OPTS = {
    acceptance: { childPolicy: 'all-ok' as const },
    synthesis: { limits: { maxTurns: 3 } },
    claimConsistency: { stage: 'final' as const, onFound: 'repair' as const, ...JUDGE_MODEL },
  };

  it("intake refuses 'repair' without a final pass or a synthesis", () => {
    expect(() =>
      makeOrchestratorWorkflow('audit', {
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { onFound: 'repair' },
      }),
    ).toThrow(/'repair' needs stage 'final' or 'both'/);
    expect(() =>
      makeOrchestratorWorkflow('audit', {
        claimConsistency: { onFound: 'repair', stage: 'final' },
      }),
    ).toThrow(/'repair' requires synthesis/);
    expect(() =>
      makeOrchestratorWorkflow('audit', {
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { onFound: 'repair', stage: 'final' },
      }),
    ).not.toThrow();
  });

  it('one repair round consumes the finding: carried prompt, re-judged clean, settled ok', async () => {
    // The 2026-08-12 comparison run verbatim, with the posture the
    // experiment lacked: the final judge names the contradiction, the
    // findings ride one more synthesis, and the repaired document is
    // judged again before anything settles.
    const { internals, judge, synthesis } = repairHarness({
      judgeTurns: [JUDGE_FINDS, JUDGE_AGREES],
      finals: [FINAL_INVERTED, FINAL_CLEAN],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', REPAIR_OPTS),
      undefined,
    )) as {
      result: unknown;
      claimContradictions?: unknown[];
      claimConsistencyMeta?: Record<string, unknown>;
      draftToFinal?: { finalHash: string };
    };
    expect(synthesis.calls).toHaveLength(2);
    expect(judge.calls).toHaveLength(2);
    // The first synthesis prompt carries no findings (the judge has
    // not run yet); the repair round carries them verbatim.
    expect(textOf(synthesis.calls[0])).not.toContain('CLAIM CONTRADICTIONS');
    expect(textOf(synthesis.calls[1])).toContain('CLAIM CONTRADICTIONS');
    expect(outcome.result).toBe(FINAL_CLEAN);
    expect(outcome.claimContradictions).toEqual([]);
    expect(outcome.claimConsistencyMeta?.judgedStage).toBe('final');
    expect(outcome.claimConsistencyMeta?.findings).toBe(0);
    // The headline verdict describes the REPAIRED document.
    expect(outcome.claimConsistencyMeta?.judgedHash).toBe(outcome.draftToFinal?.finalHash);
    // The verdict lineage (RV3904): findings 0 here is the SECOND
    // pass's verdict, earned through one round over one first-pass
    // finding, and the meta now says so instead of the journal alone.
    expect(outcome.claimConsistencyMeta?.passes).toBe(2);
    expect(outcome.claimConsistencyMeta?.firstPassFindings).toBe(1);
    expect(outcome.claimConsistencyMeta?.semanticRepairRounds).toBe(1);
    // The dispatched round is stamped with its trigger (RV4105), so
    // the repair ledger attributes 'claim' without cross-reading metas.
    const roundEntry = internals.replayer
      .snapshot()
      .find(
        (entry) =>
          entry.kind === 'agent' &&
          entry.costAttribution?.label === 'final-composition' &&
          entry.costAttribution.phase === 'repair',
      );
    expect(roundEntry?.costAttribution?.repairTrigger).toBe('claim');
  });

  it('a clean first pass under the armed round reads passes 1, rounds 0 (RV3904)', async () => {
    const { internals } = repairHarness({
      judgeTurns: [JUDGE_AGREES],
      finals: [FINAL_CLEAN],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', REPAIR_OPTS),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    expect(outcome.claimConsistencyMeta?.findings).toBe(0);
    expect(outcome.claimConsistencyMeta?.passes).toBe(1);
    expect(outcome.claimConsistencyMeta?.semanticRepairRounds).toBe(0);
    expect('firstPassFindings' in (outcome.claimConsistencyMeta ?? {})).toBe(false);
  });

  it('the lineage stays absent when no round is armed: NOT RECORDED, never one pass (RV3904)', async () => {
    const { internals } = passHarness({
      children: [POOL_READING],
      draft: DRAFT_INVERTED,
      judgeTurn: JUDGE_AGREES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { ...JUDGE_MODEL },
      }),
      undefined,
    )) as { claimConsistencyMeta?: Record<string, unknown> };
    expect(outcome.claimConsistencyMeta).toBeDefined();
    expect('passes' in (outcome.claimConsistencyMeta ?? {})).toBe(false);
    expect('semanticRepairRounds' in (outcome.claimConsistencyMeta ?? {})).toBe(false);
  });

  it('findings that survive the round fail the run typed, never a silent ok', async () => {
    const { internals, synthesis } = repairHarness({
      judgeTurns: [JUDGE_FINDS, JUDGE_FINDS],
      finals: [FINAL_INVERTED, FINAL_INVERTED],
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', REPAIR_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.repairsUsed).toBe(1);
    expect(typeof data.preRepairHash).toBe('string');
    expect(typeof data.repairedHash).toBe('string');
    expect(synthesis.calls).toHaveLength(2);
  });

  it('a dead judge under the armed repair posture fails the run typed', async () => {
    const { internals } = repairHarness({
      judgeTurns: [
        {
          error: { code: 'agent', message: 'judge died', retryable: false, data: {} },
        },
      ],
      finals: [FINAL_INVERTED],
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', REPAIR_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as FailRunError).message)).toContain('armed repair posture');
  });

  // The round's two deaths are different facts (RV3601): the third
  // comparison run's round dispatched, paid its wires and lost its
  // candidate to the finish contract, and the terminal read 'could
  // not dispatch' with repairsUsed 0 over a null judge meta.
  const RV3601_OPTS = {
    ...REPAIR_OPTS,
    finishValidation: {
      validators: [
        minMatchesValidator({ pattern: 'src/[a-z]+\\.ts:\\d+', min: 1, name: 'provenance-anchor' }),
      ],
      maxRepairs: 1,
    },
  };
  const FINAL_UNGROUNDED = 'final: repaired wording with the provenance stripped.';

  it('a round that dispatched and lost its candidate to host validation says so, typed (RV3601)', async () => {
    const { internals, synthesis } = repairHarness({
      judgeTurns: [JUDGE_FINDS],
      finals: [FINAL_INVERTED, FINAL_UNGROUNDED, FINAL_UNGROUNDED],
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', RV3601_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const message = String((thrown as FailRunError).message);
    expect(message).toContain('dispatched and its repaired candidate failed host validation');
    expect(message).not.toContain('could not dispatch');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_claim_consistency');
    expect(data.roundDispatched).toBe(true);
    expect(data.repairsUsed).toBe(1);
    expect(Array.isArray(data.claimContradictions)).toBe(true);
    expect((data.claimContradictions as unknown[]).length).toBe(1);
    const meta = data.claimConsistencyMeta as Record<string, unknown>;
    expect(meta.judgedStage).toBe('final');
    expect(meta.findings).toBe(1);
    expect(typeof data.preRepairHash).toBe('string');
    const verdict = data.finishValidation as Record<string, unknown>;
    expect(typeof verdict.callId).toBe('string');
    expect(verdict.repairsUsed).toBe(1);
    expect(verdict.maxRepairs).toBe(1);
    expect(typeof verdict.candidateHash).toBe('string');
    expect(typeof verdict.candidateChars).toBe('number');
    expect(JSON.stringify(verdict.failed)).toContain('provenance-anchor');
    // The initial composition's turn, then the round's candidate and
    // its granted mechanical repair turn: three synthesis turns.
    expect(synthesis.calls).toHaveLength(3);
  });

  // The mechanical repair pool belongs to the invocation (RV3602):
  // the third comparison run's initial composition spent the single
  // run wide repair, so its repair round entered with zero retries by
  // construction and the first regression was final. The frozen
  // sequence below is that run, carried one step further to the
  // convergence the old pool made impossible.
  const FINAL_UNGROUNDED_INITIAL = 'final: the initial wording arrived without any anchor.';

  function poolVerdictRows(
    entries: readonly { kind: string; value?: unknown }[],
  ): { verdict?: string; repairsUsed?: number }[] {
    return entries
      .filter(
        (e) =>
          e.kind === 'decision' &&
          (e.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_finish_validation',
      )
      .map((e) => e.value as { verdict?: string; repairsUsed?: number });
  }

  it('the frozen third comparison sequence converges: the round enters with its own full bound (RV3602)', async () => {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    let judgeCall = 0;
    const judgeTurns = [JUDGE_FINDS, JUDGE_AGREES];
    const judge = scriptedAdapter(
      (): ScriptedTurn => judgeTurns[Math.min(judgeCall++, judgeTurns.length - 1)] ?? JUDGE_FINDS,
      { id: 'judge' },
    );
    let synthCall = 0;
    const finals = [FINAL_UNGROUNDED_INITIAL, FINAL_INVERTED, FINAL_UNGROUNDED, FINAL_CLEAN];
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
      profiles: PROFILES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', RV3601_OPTS),
      undefined,
    )) as {
      result: unknown;
      claimContradictions?: unknown[];
      claimConsistencyMeta?: Record<string, unknown>;
      rejectedFinishCandidates?: { verdict?: string }[];
    };
    expect(outcome.result).toBe(FINAL_CLEAN);
    expect(outcome.claimContradictions).toEqual([]);
    expect(outcome.claimConsistencyMeta?.findings).toBe(0);
    expect(synthesis.calls).toHaveLength(4);
    expect(judge.calls).toHaveLength(2);
    const rows = poolVerdictRows(await store.load('test-run'));
    expect(rows.map((row) => row.verdict)).toEqual(['repair', 'accepted', 'repair', 'accepted']);
    // The discriminator: the round's regression counts a FRESH pool
    // (repairsUsed 0) where the run wide pool read 1 and rejected the
    // candidate outright.
    expect(rows.map((row) => row.repairsUsed)).toEqual([0, 1, 0, 1]);
    expect(outcome.rejectedFinishCandidates?.map((row) => row.verdict)).toEqual([
      'repair',
      'repair',
    ]);
  });

  it('a round that regresses past its OWN bound still fails typed as the host rejection (RV3602)', async () => {
    const { internals, synthesis } = repairHarness({
      judgeTurns: [JUDGE_FINDS],
      finals: [FINAL_UNGROUNDED_INITIAL, FINAL_INVERTED, FINAL_UNGROUNDED, FINAL_UNGROUNDED],
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', RV3601_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as FailRunError).message)).toContain(
      'dispatched and its repaired candidate failed host validation',
    );
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    const verdict = data.finishValidation as Record<string, unknown>;
    // The round DID get its own retry after the initial composition
    // spent one: four synthesis turns, two per invocation.
    expect(verdict.repairsUsed).toBe(1);
    expect(synthesis.calls).toHaveLength(4);
  });

  it('the round carries the bought host validation lessons beside the findings (RV3603)', async () => {
    const { internals, synthesis } = repairHarness({
      judgeTurns: [JUDGE_FINDS, JUDGE_AGREES],
      finals: [FINAL_UNGROUNDED_INITIAL, FINAL_INVERTED, FINAL_UNGROUNDED, FINAL_CLEAN],
    });
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', RV3601_OPTS),
      undefined,
    );
    // The initial composition predates any findings: no lessons line.
    expect(textOf(synthesis.calls[0])).not.toContain('HOST VALIDATION LESSONS');
    // The round's fresh invocation carries the block beside the
    // findings, naming the validator whose rejection the run already
    // paid for; the round must not relearn it.
    const roundPrompt = textOf(synthesis.calls[2]);
    expect(roundPrompt).toContain('CLAIM CONTRADICTIONS');
    expect(roundPrompt).toContain('HOST VALIDATION LESSONS');
    expect(roundPrompt).toContain('provenance-anchor');
  });

  it('a clean mechanical history adds no lessons line to the round (RV3603)', async () => {
    const { internals, synthesis } = repairHarness({
      judgeTurns: [JUDGE_FINDS, JUDGE_AGREES],
      finals: [FINAL_INVERTED, FINAL_CLEAN],
    });
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', RV3601_OPTS),
      undefined,
    );
    const roundPrompt = textOf(synthesis.calls[1]);
    expect(roundPrompt).toContain('CLAIM CONTRADICTIONS');
    expect(roundPrompt).not.toContain('HOST VALIDATION LESSONS');
  });

  it('a round that truly could not dispatch keeps its frame and now carries the judge meta (RV3601)', async () => {
    // The lifetime spawn cap admits the worker, the initial synthesis
    // and the final judge, then refuses the round's composition: the
    // one death where 'could not dispatch' is the honest frame.
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const judge = scriptedAdapter((): ScriptedTurn => JUDGE_FINDS, { id: 'judge' });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: FINAL_INVERTED } } }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
      lifetimeSpawnCap: 4,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', REPAIR_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as FailRunError).message)).toContain('could not dispatch');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.roundDispatched).toBe(false);
    expect(data.repairsUsed).toBe(0);
    expect(data.finishValidation).toBeUndefined();
    expect(Array.isArray(data.claimContradictions)).toBe(true);
    const meta = data.claimConsistencyMeta as Record<string, unknown>;
    expect(meta.findings).toBe(1);
  });

  // The convergence hold (RV3701): the round is a two invocation
  // bargain, and the verdict money is held from the moment the round
  // is admitted until its second judge pass dispatches.
  const RV3701_OPTS = {
    acceptance: { childPolicy: 'all-ok' as const },
    budget: { capUsd: 0.3, capFraction: 1.0 },
    synthesis: { limits: { maxTurns: 3 }, estCost: 0.2 },
    claimConsistency: {
      stage: 'final' as const,
      onFound: 'repair' as const,
      judge: { model: 'judge:model' as const, estCost: 0.2 },
    },
  };

  it('a round whose verdict cannot be funded refuses pre dispatch, hold named (RV3701)', async () => {
    // The declared estimates fit the orchestrator cap one at a time
    // (0.2 against 0.3) and the initial composition and first judge
    // both seat; the round is the first moment BOTH invocations must
    // fit together, and 0.2 held for the verdict plus 0.2 proposed for
    // the composition does not fit 0.3: the honest pre dispatch class
    // fires before any of the round's wires, not after its candidate.
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const judge = scriptedAdapter((): ScriptedTurn => JUDGE_FINDS, { id: 'judge' });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: FINAL_INVERTED } } }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', RV3701_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const message = String((thrown as FailRunError).message);
    expect(message).toContain('could not dispatch');
    expect(message).toContain('held convergence reserve 0.2000');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.roundDispatched).toBe(false);
    expect(data.repairsUsed).toBe(0);
  });

  it('the hold releases to the verdict pass: a funded round converges byte for byte (RV3701)', async () => {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    let judgeCall = 0;
    const judgeTurns = [JUDGE_FINDS, JUDGE_AGREES];
    const judge = scriptedAdapter(
      (): ScriptedTurn => judgeTurns[Math.min(judgeCall++, judgeTurns.length - 1)] ?? JUDGE_FINDS,
      { id: 'judge' },
    );
    let synthCall = 0;
    const finals = [FINAL_INVERTED, FINAL_CLEAN];
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: finals[Math.min(synthCall++, 1)] } },
      }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...RV3701_OPTS,
        budget: { capUsd: 0.5, capFraction: 1.0 },
      }),
      undefined,
    )) as { result: unknown };
    expect(outcome.result).toBe(FINAL_CLEAN);
    expect(judge.calls).toHaveLength(2);
    // The verdict pass consumed its hold: nothing is left committed on
    // any account once the run settled.
    expect(internals.budget.accountView('run')?.convergenceReserveUsd).toBe(0);
  });

  it('a verdict that still cannot rule after a dispatched round carries the round context (RV3701)', async () => {
    // The lifetime spawn cap admits the worker, the initial synthesis,
    // the final judge and the round's composition, then refuses the
    // verdict pass itself: the undershot estimate shape. The typed
    // decline used to describe a draft death; it now names the
    // dispatched round beside the unconsumed findings.
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const judge = scriptedAdapter((): ScriptedTurn => JUDGE_FINDS, { id: 'judge' });
    let synthCall = 0;
    const finals = [FINAL_INVERTED, FINAL_CLEAN];
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: finals[Math.min(synthCall++, 1)] } },
      }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
      lifetimeSpawnCap: 5,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', REPAIR_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as FailRunError).message)).toContain('could not be admitted');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.roundDispatched).toBe(true);
    expect(data.repairsUsed).toBe(1);
    expect(typeof data.preRepairHash).toBe('string');
    expect(Array.isArray(data.claimContradictions)).toBe(true);
    expect((data.claimContradictions as unknown[]).length).toBe(1);
    const meta = data.claimConsistencyMeta as Record<string, unknown>;
    expect(meta.judgeDeclined).toBe(true);
  });

  it('the host rejection stamps the span surfaces: entry, event, and the cut (RV3702)', async () => {
    // The third comparison run's reader saw the round's span cancelled
    // with both wires fine and had nothing to name the layer split.
    // The final rejection now stamps the terminal entry and the live
    // agent:end, and both cut surfaces count the stamps.
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const judge = scriptedAdapter((): ScriptedTurn => JUDGE_FINDS, { id: 'judge' });
    let synthCall = 0;
    const finals = [FINAL_INVERTED, FINAL_UNGROUNDED, FINAL_UNGROUNDED];
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: finals[Math.min(synthCall++, 2)] } },
      }),
      { id: 'strong' },
    );
    const { internals, store, events } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', RV3601_OPTS),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    await internals.replayer.flush();
    const entries = await store.load('test-run');
    const stamped = entries.filter(
      (entry) => entry.kind === 'agent' && entry.hostRejected === true,
    );
    expect(stamped).toHaveLength(1);
    expect(stamped[0]?.costAttribution?.label).toBe('final-composition');
    expect(stamped[0]?.status).not.toBe('ok');
    const endEvents = events
      .ofType('agent:end')
      .filter((event) => (event as { hostRejected?: boolean }).hostRejected === true);
    expect(endEvents).toHaveLength(1);
    expect(criticalPathFromJournal(entries).hostRejectedSpans).toBe(1);
  });

  it('a defective validator does not stamp the span: a defect is not a verdict (RV3702)', async () => {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: FINAL_INVERTED } } }),
      { id: 'strong' },
    );
    const { internals, store } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' as const },
        synthesis: { limits: { maxTurns: 3 } },
        finishValidation: {
          validators: [
            {
              name: 'kaput',
              validate: (): never => {
                throw new Error('the validator itself is broken');
              },
            },
          ],
          maxRepairs: 1,
        },
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(ConfigError);
    await internals.replayer.flush();
    const entries = await store.load('test-run');
    expect(entries.some((entry) => entry.hostRejected === true)).toBe(false);
  });
});

describe('the mechanical leg of the convergence hold (RV3802)', () => {
  const FINAL_INVERTED_LOCAL =
    'final: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';
  const FINAL_UNGROUNDED_LOCAL = 'final: repaired wording with the provenance stripped.';
  const FINAL_CLEAN_LOCAL =
    'final: a failed audit write does not mask success [src/exec.ts:256-296].';
  const JUDGE_FINDS_LOCAL: ScriptedTurn = {
    text: JSON.stringify({
      contradictions: [{ pair: 0, reason: 'the draft inverts the recorded reading' }],
    }),
  };
  const JUDGE_AGREES_LOCAL: ScriptedTurn = { text: JSON.stringify({ contradictions: [] }) };
  const LEG_OPTS = {
    acceptance: { childPolicy: 'all-ok' as const },
    synthesis: { limits: { maxTurns: 3 }, estCost: 0.2 },
    claimConsistency: {
      stage: 'final' as const,
      onFound: 'repair' as const,
      judge: { model: 'judge:model' as const, estCost: 0.2 },
    },
    finishValidation: {
      validators: [
        minMatchesValidator({ pattern: 'src/[a-z]+\\.ts:\\d+', min: 1, name: 'provenance-anchor' }),
      ],
      maxRepairs: 1,
      estRepairCostUsd: 0.15,
    },
  };

  function legHarness(options: { judgeTurns: ScriptedTurn[]; finals: string[] }) {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    let judgeCall = 0;
    const judge = scriptedAdapter(
      (): ScriptedTurn =>
        options.judgeTurns[Math.min(judgeCall++, options.judgeTurns.length - 1)] ??
        JUDGE_FINDS_LOCAL,
      { id: 'judge' },
    );
    let synthCall = 0;
    let onSynthesisTurn: (() => void) | undefined;
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => {
        onSynthesisTurn?.();
        return {
          toolCall: {
            name: 'finish',
            args: { result: options.finals[Math.min(synthCall++, options.finals.length - 1)] },
          },
        };
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
      judge,
      synthesis,
      armProbe: (probe: () => void) => {
        onSynthesisTurn = probe;
      },
    };
  }

  it('a round that cannot fund its granted repair turn refuses pre dispatch, both legs named', async () => {
    // 0.2 held for the verdict plus 0.15 held for the mechanical leg
    // plus 0.2 proposed for the composition does not fit 0.5; without
    // the leg the same round admits at 0.4, so the refusal is the
    // leg's own.
    const { internals } = legHarness({
      judgeTurns: [JUDGE_FINDS_LOCAL],
      finals: [FINAL_INVERTED_LOCAL],
    });
    const thrown = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...LEG_OPTS,
        budget: { capUsd: 0.5, capFraction: 1.0 },
      }),
      undefined,
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const message = String((thrown as FailRunError).message);
    expect(message).toContain('could not dispatch');
    expect(message).toContain('held convergence reserve 0.2000');
    expect(message).toContain('held repair reserve 0.1500');
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.roundDispatched).toBe(false);
    expect(data.repairsUsed).toBe(0);
  });

  it('the leg releases at the round invocation FIRST verdict, funding the granted turn', async () => {
    const { internals, armProbe, synthesis } = legHarness({
      judgeTurns: [JUDGE_FINDS_LOCAL, JUDGE_AGREES_LOCAL],
      finals: [FINAL_INVERTED_LOCAL, FINAL_UNGROUNDED_LOCAL, FINAL_CLEAN_LOCAL],
    });
    const legAtTurn: (number | undefined)[] = [];
    const verdictAtTurn: (number | undefined)[] = [];
    armProbe(() => {
      legAtTurn.push(internals.budget.accountView('run')?.repairReserveUsd);
      verdictAtTurn.push(internals.budget.accountView('run')?.convergenceReserveUsd);
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...LEG_OPTS,
        budget: { capUsd: 0.9, capFraction: 1.0 },
      }),
      undefined,
    )) as { result: unknown };
    expect(outcome.result).toBe(FINAL_CLEAN_LOCAL);
    expect(synthesis.calls).toHaveLength(3);
    // The staged lifecycle, read at each synthesis wire: the initial
    // composition predates the round (no legs), the round's candidate
    // turn runs under BOTH holds, and the granted repair turn runs
    // with the mechanical leg already released to it while the
    // verdict leg stays held for the judge.
    expect(legAtTurn).toEqual([0, 0.15, 0]);
    expect(verdictAtTurn).toEqual([0, 0.2, 0.2]);
    // Nothing stays committed once the run settles.
    expect(internals.budget.accountView('run')?.repairReserveUsd).toBe(0);
    expect(internals.budget.accountView('run')?.convergenceReserveUsd).toBe(0);
  });

  it('acceptance without a repair also releases the leg at the first verdict', async () => {
    const { internals, armProbe } = legHarness({
      judgeTurns: [JUDGE_FINDS_LOCAL, JUDGE_AGREES_LOCAL],
      finals: [FINAL_INVERTED_LOCAL, FINAL_CLEAN_LOCAL],
    });
    const legAtTurn: (number | undefined)[] = [];
    armProbe(() => {
      legAtTurn.push(internals.budget.accountView('run')?.repairReserveUsd);
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...LEG_OPTS,
        budget: { capUsd: 0.9, capFraction: 1.0 },
      }),
      undefined,
    )) as { result: unknown };
    expect(outcome.result).toBe(FINAL_CLEAN_LOCAL);
    // Two synthesis turns: the initial composition and the round's
    // accepted candidate; the leg was held only for the second and
    // consumed by nothing.
    expect(legAtTurn).toEqual([0, 0.15]);
    expect(internals.budget.accountView('run')?.repairReserveUsd).toBe(0);
  });

  it('intake refuses a negative or non finite declared estimate typed', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        finishValidation: {
          validators: [minMatchesValidator({ pattern: 'x', min: 1, name: 'provenance-anchor' })],
          estRepairCostUsd: -0.1,
        },
      }),
    ).toThrow(/estRepairCostUsd must be a nonnegative finite number/);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        finishValidation: {
          validators: [minMatchesValidator({ pattern: 'x', min: 1, name: 'provenance-anchor' })],
          estRepairCostUsd: Number.NaN,
        },
      }),
    ).toThrow(/estRepairCostUsd/);
  });
});

describe('the sectional claim repair round (RV3803)', () => {
  const PREFIX = '# Audit\n\n## Fine\n\nThe ledger holds one denominator.\n\n';
  const FINAL_SECTIONED_INVERTED =
    `${PREFIX}## Verdict\n\n` +
    'final: an audit-write failure does not turn success into failure [src/exec.ts:256-296].\n';
  const VERDICT_BODY = 'final: a failed audit write does not mask success [src/exec.ts:256-296].\n';
  const FINAL_SPLICED = `${PREFIX}## Verdict\n${VERDICT_BODY}`;
  const JUDGE_FINDS_LOCAL: ScriptedTurn = {
    text: JSON.stringify({
      contradictions: [{ pair: 0, reason: 'the draft inverts the recorded reading' }],
    }),
  };
  const JUDGE_AGREES_LOCAL: ScriptedTurn = { text: JSON.stringify({ contradictions: [] }) };
  const ROUND_OPTS = {
    acceptance: { childPolicy: 'all-ok' as const },
    synthesis: { limits: { maxTurns: 3 } },
    claimConsistency: {
      stage: 'final' as const,
      onFound: 'repair' as const,
      judge: { model: 'judge:model' as const },
    },
    finishValidation: {
      validators: [
        minMatchesValidator({ pattern: 'src/[a-z]+\\.ts:\\d+', min: 1, name: 'provenance-anchor' }),
      ],
      maxRepairs: 1,
    },
  };

  function roundHarness(synthesisTurns: readonly ScriptedTurn[], judgeTurns: ScriptedTurn[]) {
    const coordination = rootAdapter([POOL_READING], DRAFT_INVERTED);
    let judgeCall = 0;
    const judge = scriptedAdapter(
      (): ScriptedTurn =>
        judgeTurns[Math.min(judgeCall++, judgeTurns.length - 1)] ?? JUDGE_FINDS_LOCAL,
      { id: 'judge' },
    );
    let synthCall = 0;
    const synthesis = scriptedAdapter(
      (): ScriptedTurn =>
        synthesisTurns[Math.min(synthCall++, synthesisTurns.length - 1)] ?? { text: '' },
      { id: 'strong' },
    );
    const { internals, store } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    return { internals, store, judge, synthesis };
  }

  const finishWith = (result: string): ScriptedTurn => ({
    toolCall: { name: 'finish', args: { result } },
  });

  it('the round repairs ONLY the owning section: untouched bytes identical, judged whole', async () => {
    const { internals, store, judge, synthesis } = roundHarness(
      [
        finishWith(FINAL_SECTIONED_INVERTED),
        { toolCall: { name: 'finish', args: { sections: { '## Verdict': VERDICT_BODY } } } },
      ],
      [JUDGE_FINDS_LOCAL, JUDGE_AGREES_LOCAL],
    );
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', ROUND_OPTS),
      undefined,
    )) as { result?: unknown; claimConsistencyMeta?: Record<string, unknown> };
    // The spliced whole shipped: the repaired section carries the new
    // body, and every byte outside it is the accepted document's own.
    expect(outcome.result).toBe(FINAL_SPLICED);
    expect(String(outcome.result).startsWith(PREFIX)).toBe(true);
    expect(outcome.claimConsistencyMeta?.findings).toBe(0);
    expect(synthesis.calls).toHaveLength(2);
    expect(judge.calls).toHaveLength(2);
    // The round prompt carried the retained document and the targets,
    // never the full-regeneration shape.
    const roundPrompt = textOf(synthesis.calls[1] ?? ({ messages: [] } as unknown as ChatRequest));
    expect(roundPrompt).toContain('SECTIONAL ROUND');
    expect(roundPrompt).toContain('RETAINED FINAL');
    expect(roundPrompt).toContain('"## Verdict"');
    expect(roundPrompt).toContain('CLAIM CONTRADICTIONS');
    // Two accepted verdicts, no mechanical repair spent anywhere.
    const rows = (await store.load('test-run'))
      .filter(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_finish_validation',
      )
      .map((entry) => entry.value as { verdict?: string });
    expect(rows.map((row) => row.verdict)).toEqual(['accepted', 'accepted']);
  });

  it('a document without headings falls back to the full regeneration, byte for byte', async () => {
    const FINAL_FLAT_INVERTED =
      'final: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';
    const FINAL_FLAT_CLEAN =
      'final: a failed audit write does not mask success [src/exec.ts:256-296].';
    const { internals, synthesis } = roundHarness(
      [finishWith(FINAL_FLAT_INVERTED), finishWith(FINAL_FLAT_CLEAN)],
      [JUDGE_FINDS_LOCAL, JUDGE_AGREES_LOCAL],
    );
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', ROUND_OPTS),
      undefined,
    )) as { result?: unknown };
    expect(outcome.result).toBe(FINAL_FLAT_CLEAN);
    const roundPrompt = textOf(synthesis.calls[1] ?? ({ messages: [] } as unknown as ChatRequest));
    expect(roundPrompt).toContain('CLAIM CONTRADICTIONS');
    expect(roundPrompt).not.toContain('SECTIONAL ROUND');
    expect(roundPrompt).not.toContain('RETAINED FINAL');
  });

  it('an undeclared marker refuses typed without spending a verdict', async () => {
    const { internals, store, synthesis } = roundHarness(
      [
        finishWith(FINAL_SECTIONED_INVERTED),
        { toolCall: { name: 'finish', args: { sections: { '## Ghost': 'nothing' } } } },
        { toolCall: { name: 'finish', args: { sections: { '## Verdict': VERDICT_BODY } } } },
      ],
      [JUDGE_FINDS_LOCAL, JUDGE_AGREES_LOCAL],
    );
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', ROUND_OPTS),
      undefined,
    )) as { result?: unknown };
    expect(outcome.result).toBe(FINAL_SPLICED);
    expect(synthesis.calls).toHaveLength(3);
    // The mechanics refusal journaled nothing: exactly two verdicts
    // exist, both accepted, and the refused exchange spent no repair.
    const rows = (await store.load('test-run'))
      .filter(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_finish_validation',
      )
      .map((entry) => entry.value as { verdict?: string; repairsUsed?: number });
    expect(rows.map((row) => row.verdict)).toEqual(['accepted', 'accepted']);
    expect(rows.map((row) => row.repairsUsed)).toEqual([0, 0]);
  });

  it('sectionalRoundPlan is exact or silent: locates collapsed excerpts, refuses the rest', () => {
    const doc = '# T\n\n## A\n\nalpha  beta\ngamma.\n\n## B\n\ndelta epsilon.\n';
    // The excerpt arrives whitespace collapsed from the pairing fold.
    expect(sectionalRoundPlan(doc, ['alpha beta gamma.'])).toEqual({
      sections: ['## A', '## B'],
      targets: ['## A'],
    });
    expect(sectionalRoundPlan(doc, ['delta epsilon.', 'alpha beta gamma.'])?.targets).toEqual([
      '## A',
      '## B',
    ]);
    expect(sectionalRoundPlan(doc, ['missing entirely'])).toBeUndefined();
    expect(sectionalRoundPlan('no headings here', ['no headings here'])).toBeUndefined();
    expect(sectionalRoundPlan('## A\n\nx\n\n## A\n\ny', ['x'])).toBeUndefined();
    expect(sectionalRoundPlan(doc, [])).toBeUndefined();
    // An excerpt above the first heading has no owning section.
    expect(sectionalRoundPlan('intro line\n\n## A\n\nbody', ['intro line'])).toBeUndefined();
  });
});
