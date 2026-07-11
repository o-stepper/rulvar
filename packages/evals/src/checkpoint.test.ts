/**
 * The measured-value checkpoint harness (M12-T01; OQ-09 criteria).
 * Fake-adapter scenarios: one where the knowledge demonstrably pays
 * (criterion 1 through a cheaper equal-quality rung, criterion 2
 * through a card-informed agentType choice) and one where an empty
 * store honestly fails the gate.
 */
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  InMemoryStore,
  knowledgeHash,
  makeOrchestratorWorkflow,
  type Engine,
  type KnowledgeSnapshot,
  type ModelClaim,
  type ModelKnowledgeStore,
  type ModelRef,
} from '@rulvar/core';
import type { Json } from '@rulvar/core';
import { FakeAdapter, type FakeCall } from '@rulvar/testing';

import { goldenGrader } from './graders/golden.js';
import {
  renderCheckpointReport,
  agentTypeRuleHolds,
  rungRuleHolds,
  runValueCheckpoint,
  type CheckpointPool,
  type OrchestratedCase,
} from './checkpoint.js';
import type { SweepCase, SweepModel } from './sweeps.js';

const PRICING = {
  pricingVersion: 'checkpoint-test-1',
  models: {
    'fake:cheap': { inputUsdPerMTok: 1, outputUsdPerMTok: 1 },
    'fake:strong': { inputUsdPerMTok: 10, outputUsdPerMTok: 10 },
    'fake:fast': { inputUsdPerMTok: 1, outputUsdPerMTok: 1 },
    'fake:careful': { inputUsdPerMTok: 1, outputUsdPerMTok: 1 },
  },
} as const;

/** Cheap answers extraction correctly but misjudges; strong answers both. */
function memberEngine(member: SweepModel): Engine {
  const responder = (call: FakeCall): unknown => {
    if (call.prompt.includes('Extract')) {
      return { answer: 42 };
    }
    return { verdict: member.model === 'fake:strong' ? 'correct' : 'wrong' };
  };
  return createEngine({
    adapters: [new FakeAdapter({ agents: { worker: responder } })],
    stores: { journal: new InMemoryStore() },
    pricing: PRICING,
    defaults: { routing: { loop: member.model, extract: member.model }, profiles: { worker: {} } },
  });
}

const OUT_SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'number' }, verdict: { type: 'string' } },
  additionalProperties: true,
};

function workerCase(name: string, prompt: string, golden: Json): SweepCase['case'] {
  return {
    workflow: defineWorkflow({ name }, async (ctx) => {
      return await ctx.agent(prompt, { agentType: 'worker', schema: OUT_SCHEMA });
    }),
    args: null,
    graders: [goldenGrader(golden)],
  };
}

function measuredClaim(id: string, model: ModelRef, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model },
    taskClass: 'extraction',
    polarity: 'strength',
    statement: 'sweep passRate 1.00 over 10 extraction cases: at or above the strength band',
    class: 'eval-measured',
    status: 'active',
    evidence: [{ kind: 'eval', reportId: 'seed-1', caseIds: ['a'] }],
    metrics: { passRate: 1, n: 10, graderId: 'eval-suite' },
    confidence: 'medium',
    observedAt: '2026-07-11',
    expiresAt: '9999-01-01',
    author: { kind: 'eval-pipeline', id: 'ci' },
    ...extra,
  };
}

function snapshotOf(claims: ModelClaim[]): KnowledgeSnapshot {
  return { version: claims.length, hash: knowledgeHash(claims), claims };
}

const POOL: CheckpointPool = {
  ladders: [
    {
      name: 'workerLadder',
      startTier: 1,
      rungs: [{ model: 'fake:cheap' }, { model: 'fake:strong' }],
    },
  ],
  evalCases: [
    ...[1, 2, 3, 4].map((i) => ({
      taskClass: 'extraction',
      case: workerCase(
        `extract-${String(i)}`,
        `Extract the answer from record ${String(i)} as JSON.`,
        { answer: 42 },
      ),
    })),
    ...[1, 2, 3, 4].map((i) => ({
      taskClass: 'judging',
      case: workerCase(`judge-${String(i)}`, `Judge submission ${String(i)} and answer as JSON.`, {
        verdict: 'correct',
      }),
    })),
  ],
};

/**
 * Criterion 2 fixtures: the orchestrator chooses between a fast and a
 * careful profile; the card (present only in the informed arm) carries
 * the note that makes the right choice legible. The fake orchestrator
 * reads its spawn tool description exactly like a real model would:
 * spawn, await, then finish from the digest.
 */
const CAREFUL_MODEL_SPEC = {
  ladder: {
    rungs: [{ model: 'fake:careful' as ModelRef, maxTurns: 4, maxTokens: 2048 }],
    startTier: 0,
    escalateOn: ['error' as const],
  },
};

function handlesIn(call: FakeCall): number[] {
  const handles: number[] = [];
  for (const msg of call.req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const value = part.result as { handle?: number } | undefined;
        if (typeof value?.handle === 'number') {
          handles.push(value.handle);
        }
      }
    }
  }
  return handles;
}

function orchestrateEngine(withKnowledge: boolean): Engine {
  const orchestrator = (call: FakeCall): unknown => {
    const body = JSON.stringify(call.req.messages);
    const digest = body.match(/carefully considered|rushed/);
    if (digest !== null) {
      return {
        __fake: 'tool-calls',
        calls: [
          {
            name: 'finish',
            args: {
              result: { verdict: digest[0] === 'carefully considered' ? 'correct' : 'wrong' },
            },
          },
        ],
      };
    }
    const handles = handlesIn(call);
    if (handles.length > 0) {
      return { __fake: 'tool-calls', calls: [{ name: 'await_all', args: { handles } }] };
    }
    const spawnDescription =
      call.req.tools?.find((tool) => tool.name === 'spawn_agent')?.description ?? '';
    const informed = spawnDescription.includes('carefully considered verdicts');
    return {
      __fake: 'tool-calls',
      calls: [
        {
          name: 'spawn_agent',
          args: { agentType: informed ? 'careful' : 'fast', prompt: 'judge the submission' },
        },
      ],
    };
  };
  const worker = (call: FakeCall): unknown =>
    call.agentType === 'careful' ? 'carefully considered' : 'rushed';
  const store: ModelKnowledgeStore = {
    current: () =>
      Promise.resolve(
        snapshotOf([
          measuredClaim('k1', 'fake:careful', {
            taskClass: 'judging',
            statement: 'produces carefully considered verdicts on judging cases',
            class: 'human-editorial',
            metrics: undefined,
            author: { kind: 'human', id: 'founder' },
          }),
        ]),
      ),
    commit: () => Promise.reject(new Error('read-only')),
  };
  return createEngine({
    adapters: [new FakeAdapter({ agents: { fast: worker, careful: worker, '*': orchestrator } })],
    stores: {
      journal: new InMemoryStore(),
      ...(withKnowledge ? { modelKnowledge: store } : {}),
    },
    pricing: PRICING,
    defaults: {
      routing: { loop: 'fake:fast', orchestrate: 'fake:fast' },
      // The ladder lives on a never-spawned specialist profile purely to
      // make the claim's subject reachable for the card (the kb cassette
      // pattern); spawned profiles stay plainly resolvable.
      profiles: {
        fast: {},
        careful: { model: 'fake:careful' },
        specialist: { model: CAREFUL_MODEL_SPEC },
      },
    },
  });
}

const ORCHESTRATED: OrchestratedCase[] = [1, 2].map((i) => ({
  case: {
    // The orchestrator workflow takes undefined args; EvalCase carries
    // Json args, so the fixture widens the generic explicitly.
    workflow: makeOrchestratorWorkflow(
      `judge submission ${String(i)}`,
      {},
    ) as unknown as OrchestratedCase['case']['workflow'],
    args: null,
    graders: [goldenGrader({ verdict: 'correct' })],
  },
}));

describe('the value checkpoint (M12-T01; OQ-09)', () => {
  it('agentTypeRuleHolds implements the amended two-branch rule exactly (OQ-09, 2026-07-12)', () => {
    const base = { passRate: 0.6, totalCostUsd: 1, n: 10 };
    // Branch 1: match or beat at 105 percent of cost.
    expect(agentTypeRuleHolds(base, { passRate: 0.6, totalCostUsd: 1.05, n: 10 })).toBe(true);
    expect(agentTypeRuleHolds(base, { passRate: 0.6, totalCostUsd: 1.06, n: 10 })).toBe(false);
    expect(agentTypeRuleHolds(base, { passRate: 0.59, totalCostUsd: 0.5, n: 10 })).toBe(false);
    // Branch 2 (the quality branch): at least 15 points better at 115
    // percent of cost. The measured runs 8 and 9 land here: plus 40 at
    // 107.9 percent and plus 20 at 106.6 percent.
    expect(agentTypeRuleHolds(base, { passRate: 0.75, totalCostUsd: 1.15, n: 10 })).toBe(true);
    expect(agentTypeRuleHolds(base, { passRate: 0.75, totalCostUsd: 1.16, n: 10 })).toBe(false);
    expect(agentTypeRuleHolds(base, { passRate: 0.74, totalCostUsd: 1.1, n: 10 })).toBe(false);
    expect(agentTypeRuleHolds(base, { passRate: 1, totalCostUsd: 1.079, n: 10 })).toBe(true);
    expect(agentTypeRuleHolds(base, { passRate: 0.8, totalCostUsd: 1.066, n: 10 })).toBe(true);
  });

  it('rungRuleHolds implements the two-branch cell rule exactly', () => {
    const base = { passRate: 0.8, totalCostUsd: 1, n: 20 };
    expect(rungRuleHolds(base, { passRate: 0.8, totalCostUsd: 0.9, n: 20 })).toBe(true);
    expect(rungRuleHolds(base, { passRate: 0.8, totalCostUsd: 0.91, n: 20 })).toBe(false);
    expect(rungRuleHolds(base, { passRate: 0.85, totalCostUsd: 1, n: 20 })).toBe(true);
    expect(rungRuleHolds(base, { passRate: 0.84, totalCostUsd: 1, n: 20 })).toBe(false);
    expect(rungRuleHolds(base, { passRate: 0.79, totalCostUsd: 0.1, n: 20 })).toBe(false);
  });

  it('passes when a measured strength shifts a cell to a cheaper equal rung', async () => {
    const snapshot = snapshotOf([measuredClaim('c1', 'fake:cheap')]);
    const report = await runValueCheckpoint(POOL, {
      snapshot,
      observedAt: '2026-07-11T00:00:00.000Z',
      engineFor: memberEngine,
      orchestrateEngineFor: orchestrateEngine,
      orchestratedCases: ORCHESTRATED,
    });
    const extraction = report.criterion1.cells.find((cell) => cell.taskClass === 'extraction');
    const judging = report.criterion1.cells.find((cell) => cell.taskClass === 'judging');
    expect(extraction?.recommended).toBe(true);
    expect(extraction?.treatmentTier).toBe(0);
    expect(extraction?.passed).toBe(true);
    expect(
      extraction !== undefined &&
        extraction.treatment.totalCostUsd < extraction.baseline.totalCostUsd,
    ).toBe(true);
    // The card said nothing about judging: neutral for the majority.
    expect(judging?.recommended).toBe(false);
    expect(report.criterion1.majorityHolds).toBe(true);
    expect(report.criterion1.pooledHolds).toBe(true);
    expect(report.criterion1.passed).toBe(true);
    // The informed orchestrator picked the careful profile and won.
    expect(report.criterion2?.baseline.passRate).toBe(0);
    expect(report.criterion2?.informed.passRate).toBe(1);
    expect(report.criterion2?.passed).toBe(true);
    expect(report.passed).toBe(true);
    const rendered = renderCheckpointReport(report);
    expect(rendered).toContain('PASSED');
    expect(rendered).toContain('workerLadder :: extraction');
  });

  it('fails honestly on an empty store and renders the unmeasured criterion', async () => {
    const report = await runValueCheckpoint(POOL, {
      snapshot: snapshotOf([]),
      observedAt: '2026-07-11T00:00:00.000Z',
      engineFor: memberEngine,
    });
    expect(report.criterion1.cells.every((cell) => !cell.recommended)).toBe(true);
    expect(report.criterion1.majorityHolds).toBe(false);
    expect(report.criterion1.passed).toBe(false);
    expect(report.criterion2).toBeUndefined();
    expect(report.passed).toBe(false);
    expect(renderCheckpointReport(report)).toContain('NOT MEASURED');
  });
});
