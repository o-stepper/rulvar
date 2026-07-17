/**
 * Budget surfaces of @rulvar/evals (v1.16.2 review P1-2): the
 * debit-only SpendEnvelope, per-probe canary ceilings with the allOk
 * drift gate, envelope enforcement through targets and judges, and the
 * claim-safety rules (an exhausted target or a refused cell never
 * becomes a model belief). FakeAdapter reports no pricing, so every
 * spawn reserves the engine's flat $0.50: ceilings below that exhaust
 * a run before its first provider call.
 */
import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  createEngine,
  defineWorkflow,
  InMemoryStore,
  type Engine,
} from '@rulvar/core';
import { FakeAdapter, FAKE_MODEL_REF } from '@rulvar/testing';

import { goldenGrader } from './graders/golden.js';
import { judgeGrader } from './graders/judge.js';
import { canaryFingerprint, runCanary } from './canary.js';
import { SpendEnvelope, SweepBudgetError } from './envelope.js';
import { runSweepMatrix, type SweepPool } from './sweeps.js';

const ANSWER_SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'number' } },
  required: ['answer'],
  additionalProperties: false,
};

const mathWorkflow = defineWorkflow({ name: 'sweep-math' }, async (ctx) => {
  return await ctx.agent('Compute 6*7 and answer as JSON.', {
    agentType: 'worker',
    schema: ANSWER_SCHEMA,
  });
});

function fixture(): { engine: Engine; store: InMemoryStore; calls: () => number } {
  let calls = 0;
  const fake = new FakeAdapter({
    agents: {
      '*': () => {
        calls += 1;
        return { answer: 42 };
      },
    },
  });
  const store = new InMemoryStore();
  const engine = createEngine({
    adapters: [fake],
    stores: { journal: store },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
      profiles: { worker: {}, probe: {} },
    },
  });
  return { engine, store, calls: () => calls };
}

const PROBES = { agentType: 'probe', prompts: ['probe one', 'probe two'] };

describe('SpendEnvelope (debit-only, micro-USD)', () => {
  it('admits exact fits and refuses the first overshoot', () => {
    const envelope = new SpendEnvelope(0.3);
    envelope.authorize(0.1, 'a');
    envelope.authorize(0.2, 'b');
    expect(envelope.authorizedUsd).toBe(0.3);
    expect(envelope.remainingUsd).toBe(0);
    expect(() => envelope.authorize(0.000001, 'c')).toThrowError(SweepBudgetError);
  });

  it('never returns authorizations and rejects unaccountable ceilings', () => {
    const envelope = new SpendEnvelope(1);
    envelope.authorize(0.75, 'a');
    expect(envelope.remainingUsd).toBe(0.25);
    for (const bad of [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => envelope.authorize(bad, 'x')).toThrowError(ConfigError);
    }
    // The rejected authorizations debited nothing.
    expect(envelope.remainingUsd).toBe(0.25);
    expect(() => new SpendEnvelope(0)).toThrowError(ConfigError);
  });

  it('carries the refusal detail on SweepBudgetError', () => {
    const envelope = new SpendEnvelope(1);
    envelope.authorize(0.8, 'a');
    try {
      envelope.authorize(0.5, "eval target 'sweep-math'");
      expect.unreachable();
    } catch (error) {
      const refusal = error as SweepBudgetError;
      expect(refusal).toBeInstanceOf(SweepBudgetError);
      expect(refusal.runLabel).toBe("eval target 'sweep-math'");
      expect(refusal.ceilingUsd).toBe(0.5);
      expect(refusal.authorizedUsd).toBe(0.8);
      expect(refusal.maxTotalUsd).toBe(1);
    }
  });
});

describe('canary budgets and the allOk drift gate', () => {
  it('records the per-probe ceiling on every canary RunMeta', async () => {
    const { engine, store } = fixture();
    const report = await runCanary(engine, PROBES, { budgetUsd: 0.75 });
    expect(report.allOk).toBe(true);
    expect(report.probes.map((probe) => probe.status)).toEqual(['ok', 'ok']);
    const metas = await store.listRuns();
    const canaries = metas.filter((meta) => meta.workflowName?.startsWith('kb-canary:'));
    expect(canaries).toHaveLength(2);
    for (const meta of canaries) {
      expect(meta.budgetUsd).toBe(0.75);
    }
  });

  it('clears allOk when a probe exhausts its ceiling, with zero provider calls', async () => {
    const { engine, calls } = fixture();
    // 0.01 is below the flat $0.50 admission reserve: both probes
    // exhaust before their first provider call, the fingerprint
    // carries !exhausted, and allOk gates any drift flipping.
    const report = await runCanary(engine, PROBES, { budgetUsd: 0.01 });
    expect(report.allOk).toBe(false);
    expect(report.probes.map((probe) => probe.status)).toEqual(['exhausted', 'exhausted']);
    expect(calls()).toBe(0);
    const healthy = await runCanary(fixture().engine, PROBES, { budgetUsd: 0.75 });
    expect(report.fingerprint).not.toBe(healthy.fingerprint);
  });

  it('authorizes each probe against the shared envelope and keeps canaryFingerprint compatible', async () => {
    const { engine } = fixture();
    const envelope = new SpendEnvelope(1);
    const fingerprint = await canaryFingerprint(engine, PROBES, { budgetUsd: 0.5, envelope });
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(envelope.authorizedUsd).toBe(1);
    // The envelope requires a ceiling, and a refused probe never runs.
    await expect(runCanary(engine, PROBES, { envelope })).rejects.toThrowError(ConfigError);
    await expect(runCanary(engine, PROBES, { budgetUsd: 0.5, envelope })).rejects.toThrowError(
      SweepBudgetError,
    );
  });
});

describe('sweep envelope and claim safety', () => {
  const sweepOptions = {
    reportId: 'sweep-budget-test',
    committerId: 'ci-evals',
    observedAt: '2026-07-17T00:00:00.000Z',
  };

  it('bounds targets and judges through the envelope and flags the refused cell', async () => {
    const { engine, calls } = fixture();
    const pool: SweepPool = {
      models: [{ model: FAKE_MODEL_REF }],
      cases: [
        {
          taskClass: 'extraction',
          case: { workflow: mathWorkflow, args: null, graders: [goldenGrader({ answer: 42 })] },
        },
        {
          taskClass: 'judging',
          case: { workflow: mathWorkflow, args: null, graders: [goldenGrader({ answer: 42 })] },
        },
      ],
    };
    // Two cells want $0.75 each; the envelope holds one. The second
    // cell is refused BEFORE its run starts, lands as
    // envelopeExhausted with no claim, and the report stays complete.
    const report = await runSweepMatrix(pool, {
      ...sweepOptions,
      engineFor: () => engine,
      suite: { budgetUsd: 0.75 },
      envelope: new SpendEnvelope(1),
    });
    expect(report.cells).toHaveLength(2);
    expect(report.cells[0].envelopeExhausted).toBeUndefined();
    expect(report.cells[0].n).toBe(1);
    expect(report.cells[1].envelopeExhausted).toBe(true);
    expect(report.cells[1].n).toBe(0);
    expect(report.claims.map((claim) => claim.taskClass)).toEqual(['extraction']);
    expect(calls()).toBe(1);
  });

  it('requires per-run ceilings under an envelope (targets upfront, judges at call time)', async () => {
    const { engine } = fixture();
    const pool: SweepPool = {
      models: [{ model: FAKE_MODEL_REF }],
      cases: [
        {
          taskClass: 'extraction',
          case: { workflow: mathWorkflow, args: null, graders: [goldenGrader({ answer: 42 })] },
        },
      ],
    };
    await expect(
      runSweepMatrix(pool, {
        ...sweepOptions,
        engineFor: () => engine,
        envelope: new SpendEnvelope(1),
      }),
    ).rejects.toThrowError(/an aggregate envelope requires suite\.budgetUsd/);

    const judged: SweepPool = {
      models: [{ model: FAKE_MODEL_REF }],
      cases: [
        {
          taskClass: 'judging',
          case: {
            workflow: mathWorkflow,
            args: null,
            graders: [judgeGrader({ model: FAKE_MODEL_REF, instruction: 'judge it' })],
          },
        },
      ],
    };
    await expect(
      runSweepMatrix(judged, {
        ...sweepOptions,
        engineFor: () => engine,
        suite: { budgetUsd: 0.75 },
        envelope: new SpendEnvelope(10),
      }),
    ).rejects.toThrowError(/positive per-run ceiling for eval judge/);
  });

  it('suppresses the claim of a cell whose target exhausted its own ceiling', async () => {
    const { engine, calls } = fixture();
    const pool: SweepPool = {
      models: [{ model: FAKE_MODEL_REF }],
      cases: [
        {
          taskClass: 'extraction',
          case: { workflow: mathWorkflow, args: null, graders: [goldenGrader({ answer: 42 })] },
        },
      ],
    };
    // 0.01 is below the flat $0.50 reserve: the target exhausts with
    // zero provider calls and passRate 0 crosses the weakness
    // threshold, but a budget-starved measurement must NOT commit a
    // weakness claim blaming the model for the ceiling.
    const report = await runSweepMatrix(pool, {
      ...sweepOptions,
      engineFor: () => engine,
      suite: { budgetUsd: 0.01 },
    });
    expect(report.cells).toHaveLength(1);
    expect(report.cells[0].exhaustedRuns).toBe(1);
    expect(report.cells[0].passRate).toBe(0);
    expect(report.claims).toEqual([]);
    expect(calls()).toBe(0);
  });

  it('keeps the empty pool zero-cost with an untouched envelope', async () => {
    const { engine, calls } = fixture();
    const envelope = new SpendEnvelope(1);
    const report = await runSweepMatrix(
      { models: [], cases: [] },
      { ...sweepOptions, engineFor: () => engine, suite: { budgetUsd: 0.5 }, envelope },
    );
    expect(report.cells).toEqual([]);
    expect(report.claims).toEqual([]);
    expect(calls()).toBe(0);
    expect(envelope.authorizedUsd).toBe(0);
  });
});
