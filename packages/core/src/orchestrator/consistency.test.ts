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
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';

import { pairDraftClaims } from './consistency.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

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
    expect(fold).toEqual({ pairs: [], truncated: false, draftCitingSentences: 0 });
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
    expect(outcome.claimConsistencyMeta).toEqual({
      poolChildren: 1,
      draftCitingSentences: 1,
      pairs: 1,
      truncated: false,
      judgeInvoked: true,
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
    expect(outcome.claimConsistencyMeta).toEqual({
      poolChildren: 1,
      draftCitingSentences: 0,
      pairs: 0,
      truncated: false,
      judgeInvoked: false,
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
