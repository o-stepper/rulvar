/**
 * Budget honesty (RV4404, the seventh comparison experiment). The
 * intake gate verified the acceptance tail against DECLARED estimates
 * and the run passed `fits: true` honestly; the workers then overshot
 * their declared 0.25 USD est 2.8x each, and the refusal came only
 * where the armed round could not dispatch, AFTER the composition and
 * both judges were paid. Three answers, each opt-in: the 'checkpoint'
 * reserve re-runs the same arithmetic at the money actually spent
 * before every paid tail dispatch; `estIsCeiling` turns a declared
 * spawn estimate into the child's own hard allowance ceiling; and a
 * declared coverage target that the pair ceiling still cuts grades
 * 'coverage-capped', naming the config knob instead of blaming the
 * document.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { claimCoverageOf } from './consistency.js';
import { semanticTerminalVerdictOf } from './semantic-verdict.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'does one heavy task', estCost: 0.25 } };

/** 200k in + 100k out at the fake caps (1/10 per MTok) = 1.2 USD. */
const HEAVY_USAGE = {
  inputTokens: 200_000,
  outputTokens: 100_000,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
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

/**
 * The seventh run's trajectory in miniature: two workers whose ACTUAL
 * spend (1.2 USD each) dwarfs their declared 0.25 USD est, then the
 * acceptance tail (a held synthesis reserve, a declared claim judge).
 * The declared tail fits the ceilings at zero spend; the actual
 * fan-out spend makes it unpayable.
 */
function overshootHarness() {
  let orchTurn = 0;
  let synthCalls = 0;
  let judgeCalls = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'the worker read everything and found nothing', usage: HEAVY_USAGE };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCalls: [
          { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'sweep A' } },
          { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'sweep B' } },
        ],
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'the coordination draft' } } };
  });
  const judge = scriptedAdapter(
    (): ScriptedTurn => {
      judgeCalls += 1;
      return { text: JSON.stringify({ contradictions: [] }) };
    },
    { id: 'judge' },
  );
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => {
      synthCalls += 1;
      return { toolCall: { name: 'finish', args: { result: 'the composed final' } } };
    },
    { id: 'strong' },
  );
  const { internals, store } = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
    // The run root ceiling: fan-out spend debits the ROOT (the
    // seventh run's refusal named account 'run'), so the checkpoint
    // arithmetic must bind there.
    budgetUsd: 3.9,
  });
  return {
    internals,
    store,
    synthCalls: () => synthCalls,
    judgeCalls: () => judgeCalls,
  };
}

const TAIL_OPTS = {
  acceptance: { childPolicy: 'all-ok' as const },
  // Three loop turns (spawn, await, finish): the loop's own admission
  // hold is maxTurns x the flat reserve, and an unbounded default
  // would hold the whole root before the first spawn admits.
  limits: { maxTurns: 3 },
  synthesis: { estCost: 0.3 },
  claimConsistency: {
    stage: 'final' as const,
    onFound: 'report' as const,
    judge: { model: 'judge:model' as const, estCost: 0.2 },
  },
} as const;

describe("acceptanceReserve 'checkpoint' (RV4404)", () => {
  it('the seventh trajectory: the refusal moves to right after the workers, before any tail stage is paid', async () => {
    const rig = overshootHarness();
    await expect(
      executeWorkflow(
        rig.internals,
        makeOrchestratorWorkflow('sweep the estate', {
          ...TAIL_OPTS,
          budget: {
            capUsd: 2.0,
            capFraction: 1.0,
            synthesisReserveUsd: 1.0,
            acceptanceReserve: 'checkpoint',
          },
        }),
        undefined,
      ),
    ).rejects.toMatchObject({
      data: {
        source: 'orchestrator_budget',
        stage: 'composition',
        account: 'run',
      },
    });
    // The whole point: the tail stages were NOT paid.
    expect(rig.synthCalls()).toBe(0);
    expect(rig.judgeCalls()).toBe(0);
    // The refusal journaled its arithmetic.
    const entries = await rig.store.load('test-run');
    const refusal = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'acceptance_checkpoint_refused',
    );
    expect(refusal).toBeDefined();
    const value = refusal?.value as {
      stage: string;
      spentUsd: number;
      remainingTailUsd: number;
      effectiveCapUsd: number;
    };
    expect(value.stage).toBe('composition');
    // Two heavy workers at 1.2 USD each dominate the spend.
    expect(value.spentUsd).toBeGreaterThan(2.3);
    expect(value.effectiveCapUsd).toBeCloseTo(3.9, 10);
    // No synthesis span, no judge span: the journal records the
    // fan-out and the refusal, nothing tail-priced after it.
  });

  it("the same trajectory under 'require' pays the tail: the checkpoint is the difference", async () => {
    const rig = overshootHarness();
    const outcome = await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('sweep the estate', {
        ...TAIL_OPTS,
        budget: {
          capUsd: 2.0,
          capFraction: 1.0,
          synthesisReserveUsd: 1.0,
          acceptanceReserve: 'require',
        },
      }),
      undefined,
    );
    expect((outcome as { result?: unknown }).result).toBe('the composed final');
    expect(rig.synthCalls()).toBeGreaterThan(0);
  });

  it("intake still gates 'checkpoint' exactly like 'require': an unpayable declared tail never boots", () => {
    const rig = overshootHarness();
    return expect(
      executeWorkflow(
        rig.internals,
        makeOrchestratorWorkflow('sweep the estate', {
          ...TAIL_OPTS,
          budget: {
            capUsd: 1.2,
            capFraction: 1.0,
            synthesisReserveUsd: 1.0,
            acceptanceReserve: 'checkpoint',
          },
        }),
        undefined,
      ),
    ).rejects.toThrow(/acceptanceReserve 'checkpoint': the declared acceptance tail does not fit/);
  });
});

describe('estIsCeiling (RV4404)', () => {
  it("a declared estimate becomes the child's own hard allowance ceiling", async () => {
    const rig = overshootHarness();
    // The run itself dies at the checkpoint or succeeds; what this
    // test pins is the ACCOUNT SHAPE the opt-in creates: each spawned
    // child runs under its own allowance account whose ceiling is the
    // declared estimate, so an overshooting child refuses at ITS
    // ceiling instead of silently eating the acceptance tail.
    await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('sweep the estate', {
        acceptance: { childPolicy: 'all-ok' as const },
        limits: { maxTurns: 3 },
        budget: { capUsd: 2.0, capFraction: 1.0, estIsCeiling: true },
      }),
      undefined,
    ).catch(() => undefined);
    // Tool-spawned children share the orchestrator's child scope, so
    // the enforced bound is the AGGREGATE of the declared estimates:
    // two admitted workers at 0.25 USD each hold a 0.50 USD fan-out
    // allowance, the exact number the tail arithmetic trusted.
    const view = rig.internals.budget.accountView('agent:0');
    expect(view).toBeDefined();
    expect(view?.ceilingUsd).toBeCloseTo(0.5, 10);
  });

  it('without the opt-in, spawns keep the parent-account flow: no child account exists', async () => {
    const rig = overshootHarness();
    await executeWorkflow(
      rig.internals,
      makeOrchestratorWorkflow('sweep the estate', {
        acceptance: { childPolicy: 'all-ok' as const },
        limits: { maxTurns: 3 },
        budget: { capUsd: 2.0, capFraction: 1.0 },
      }),
      undefined,
    ).catch(() => undefined);
    expect(rig.internals.budget.accountView('agent:0')).toBeUndefined();
  });
});

describe("the 'coverage-capped' grade (RV4404)", () => {
  const BASE = {
    draftCitingSentences: 105,
    coveredCitingSentences: 82,
    truncated: true,
  };

  it('a truncation under a declared target names the ceiling; without one it stays partial', () => {
    expect(claimCoverageOf({ ...BASE, coverageTargetDeclared: true })).toBe('coverage-capped');
    expect(claimCoverageOf(BASE)).toBe('partial');
    // Uncovered sentences WITHOUT truncation are the pool's honest
    // limit, not the ceiling's cut: 'partial' either way.
    expect(
      claimCoverageOf({
        draftCitingSentences: 10,
        coveredCitingSentences: 8,
        truncated: false,
        coverageTargetDeclared: true,
      }),
    ).toBe('partial');
    // Critical anchors still outrank the capped reading.
    expect(
      claimCoverageOf({ ...BASE, coverageTargetDeclared: true, criticalUncoveredTotal: 1 }),
    ).toBe('critical-uncovered');
  });

  it("the semantic verdict folds 'coverage-capped' into the partial bucket, never clean", () => {
    const verdict = semanticTerminalVerdictOf({
      claimConsistencyMeta: {
        coverage: 'coverage-capped',
        findings: 0,
        judgedHash: 'a'.repeat(64),
      },
    });
    expect(verdict?.verdict).toBe('partial');
  });
});
