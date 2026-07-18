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
import { runEvalSuite, type Grader } from './case.js';
import { SpendEnvelope, SweepBudgetError } from './envelope.js';
import { runSweepMatrix, type SweepPool } from './sweeps.js';

const MICRO_PER_USD = 1_000_000;

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

  it('is conservative at the micro-USD boundary (v1.17.0 review P1-4)', () => {
    // A cap below one micro-USD could only ever admit zero-debit runs.
    expect(() => new SpendEnvelope(0.0000004)).toThrowError(/1 micro-USD/u);
    // A sub-micro ceiling debits a FULL micro, never zero: the second
    // authorization no longer fits a one-micro envelope, so the
    // formerly unbounded stream of zero-debit authorizations is gone.
    const oneMicro = new SpendEnvelope(0.000001);
    oneMicro.authorize(0.0000004, 'tiny');
    expect(oneMicro.authorizedUsd).toBe(0.000001);
    expect(() => oneMicro.authorize(0.0000004, 'tiny-2')).toThrowError(SweepBudgetError);
    // The cap floors: 1.4 micro admits exactly one micro of debits.
    const floored = new SpendEnvelope(0.0000014);
    floored.authorize(0.000001, 'a');
    expect(() => floored.authorize(0.000001, 'b')).toThrowError(SweepBudgetError);
    // Exact fits in the unit pass and one more unit is refused.
    const exact = new SpendEnvelope(0.000003);
    exact.authorize(0.000001, 'a');
    exact.authorize(0.000001, 'b');
    exact.authorize(0.000001, 'c');
    expect(exact.remainingUsd).toBe(0);
    expect(() => exact.authorize(0.000001, 'd')).toThrowError(SweepBudgetError);
    // Float noise around an integer micro amount stays exact.
    const noisy = new SpendEnvelope(0.3);
    noisy.authorize(0.1 + 0.2 - 0.2, 'noise');
    noisy.authorize(0.2, 'rest');
    expect(noisy.remainingUsd).toBe(0);
  });

  it('directed rounding survives dollar magnitudes and the domain is safe-integer bounded (v1.18.0 review P1-4)', () => {
    // The relative-tolerance defect: at $0.5000004 the ceil snapped DOWN
    // to 500000 micro, so two authorizations totalling $1.0000008 both
    // fit a $1 cap. The ULP-scale window keeps the directed ceil.
    const relative = new SpendEnvelope(1);
    relative.authorize(0.5000004, 'a');
    expect(() => relative.authorize(0.5000004, 'b')).toThrowError(SweepBudgetError);
    // The cap floors at dollar scale too: $0.5000006 floors to 500000
    // micro and cannot admit a $0.500001 debit.
    const floored = new SpendEnvelope(0.5000006);
    expect(() => floored.authorize(0.500001, 'big')).toThrowError(SweepBudgetError);
    // Amounts whose micro conversion leaves the safe integer domain are
    // rejected up front instead of degrading into Infinity arithmetic
    // (a Number.MAX_VALUE cap admitted EVERYTHING with remainingUsd NaN).
    expect(() => new SpendEnvelope(Number.MAX_VALUE)).toThrowError(ConfigError);
    expect(() => new SpendEnvelope(1e16)).toThrowError(ConfigError);
    const finite = new SpendEnvelope(10);
    expect(() => finite.authorize(Number.MAX_VALUE, 'huge')).toThrowError(ConfigError);
    expect(() => finite.authorize(1e16, 'huge')).toThrowError(ConfigError);
    // The rejected out-of-domain authorizations debited nothing.
    expect(finite.remainingUsd).toBe(10);
    // A large in-domain cap still constructs and accounts exactly
    // ($9e9 converts to 9e15 micro, inside the 2^53 domain).
    const edge = new SpendEnvelope(9_000_000_000);
    edge.authorize(9_000_000_000, 'all');
    expect(edge.remainingUsd).toBe(0);
  });

  it('property: the sum of admitted ORIGINAL ceilings never exceeds maxTotalUsd', () => {
    // Deterministic LCG; mixes exact-micro amounts with sub-micro noise.
    let seed = 42;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let round = 0; round < 50; round += 1) {
      const max = 0.000001 + next() * 0.01;
      const envelope = new SpendEnvelope(max);
      let admittedSum = 0;
      for (let i = 0; i < 200; i += 1) {
        const exactMicro = next() < 0.5;
        const ceiling = exactMicro
          ? Math.max(1, Math.round(next() * 2000)) / MICRO_PER_USD
          : next() * 0.002 + 1e-9;
        try {
          envelope.authorize(ceiling, `run-${String(i)}`);
          admittedSum += ceiling;
        } catch (error) {
          // Refusals debit nothing; later smaller ceilings may still fit.
          expect(error).toBeInstanceOf(SweepBudgetError);
        }
      }
      expect(admittedSum).toBeLessThanOrEqual(max + 1e-9);
    }
    // Dollar magnitudes (v1.18.0 review P1-4): the ULP snap must keep
    // directed rounding where the old relative tolerance collapsed it
    // into round-to-nearest above roughly $0.50.
    for (let round = 0; round < 30; round += 1) {
      const max = 0.5 + next() * 200;
      const envelope = new SpendEnvelope(max);
      let admittedSum = 0;
      for (let i = 0; i < 200; i += 1) {
        const pick = next();
        const ceiling =
          pick < 0.34
            ? Math.max(1, Math.round(next() * 5_000_000)) / MICRO_PER_USD
            : pick < 0.67
              ? (Math.max(1, Math.round(next() * 5_000_000)) + 0.4) / MICRO_PER_USD
              : next() * 5 + 1e-9;
        try {
          envelope.authorize(ceiling, `run-${String(i)}`);
          admittedSum += ceiling;
        } catch (error) {
          expect(error).toBeInstanceOf(SweepBudgetError);
        }
      }
      expect(admittedSum).toBeLessThanOrEqual(max + 1e-9);
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
    // The envelope requires a ceiling.
    await expect(runCanary(engine, PROBES, { envelope })).rejects.toThrowError(ConfigError);
    // An exhausted envelope refuses the probes WITHOUT throwing away
    // the report (v1.17.0 review P1-5): every refused probe is a row,
    // nothing runs, and allOk gates any drift flip.
    const refused = await runCanary(engine, PROBES, { budgetUsd: 0.5, envelope });
    expect(refused.allOk).toBe(false);
    expect(refused.probes.map((probe) => probe.status)).toEqual(['refused', 'refused']);
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

describe('monotone cells: paid evidence survives refusals (v1.17.0 review P1-5)', () => {
  const sweepOptions = {
    reportId: 'sweep-monotone-test',
    committerId: 'ci-evals',
    observedAt: '2026-07-18T00:00:00.000Z',
  };

  /** A grader that judges through the engine (one judge run per case). */
  const judgeUser: Grader = {
    name: 'judge-user',
    grade: async (context) => {
      await context.judge({
        model: { model: FAKE_MODEL_REF },
        prompt: 'judge it',
        schema: ANSWER_SCHEMA,
      });
      return { grader: 'judge-user', passed: true };
    },
  };

  it('a mid-cell target refusal keeps the completed case, its name, and its cost', async () => {
    const { engine, calls } = fixture();
    const report = await runSweepMatrix(
      {
        models: [{ model: FAKE_MODEL_REF }],
        cases: [
          { taskClass: 'math', case: { workflow: mathWorkflow, args: null, graders: [] } },
          { taskClass: 'math', case: { workflow: mathWorkflow, args: null, graders: [] } },
        ],
      },
      {
        ...sweepOptions,
        engineFor: () => engine,
        suite: { budgetUsd: 1 },
        envelope: new SpendEnvelope(1.5),
      },
    );
    const cell = report.cells[0];
    // Case 1 ran and paid; case 2 was refused. The cell reports BOTH
    // facts instead of erasing the paid measurement.
    expect(calls()).toBe(1);
    expect(cell.n).toBe(1);
    expect(cell.plannedN).toBe(2);
    expect(cell.caseNames).toEqual(['sweep-math']);
    expect(cell.envelopeExhausted).toBe(true);
    expect(cell.incompleteReason).toBe('envelope-exhausted');
    expect(cell.refusedRunLabel).toContain('sweep-math');
    expect(report.claims).toEqual([]);
  });

  it('a judge hitting its own ceiling normalizes into the row, never an EvalJudgeError abort', async () => {
    const { engine, calls } = fixture();
    // 0.01 is below the flat $0.50 admission reserve: the judge run
    // exhausts with zero provider calls while the paid target stays.
    const report = await runSweepMatrix(
      {
        models: [{ model: FAKE_MODEL_REF }],
        cases: [
          { taskClass: 'math', case: { workflow: mathWorkflow, args: null, graders: [judgeUser] } },
        ],
      },
      {
        ...sweepOptions,
        engineFor: () => engine,
        suite: { budgetUsd: 1, judgeBudgetUsd: 0.01 },
      },
    );
    const cell = report.cells[0];
    expect(calls()).toBe(1);
    expect(cell.n).toBe(1);
    expect(cell.plannedN).toBe(1);
    expect(cell.judgeIncompleteRuns).toBe(1);
    expect(cell.incompleteReason).toBe('judge-exhausted');
    expect(cell.caseNames).toEqual(['sweep-math']);
    expect(cell.passRate).toBe(0);
    expect(report.claims).toEqual([]);
  });

  it('an envelope refusing the judge keeps the paid successful target as evidence', async () => {
    const { engine, calls } = fixture();
    const report = await runSweepMatrix(
      {
        models: [{ model: FAKE_MODEL_REF }],
        cases: [
          { taskClass: 'math', case: { workflow: mathWorkflow, args: null, graders: [judgeUser] } },
        ],
      },
      {
        ...sweepOptions,
        engineFor: () => engine,
        suite: { budgetUsd: 1, judgeBudgetUsd: 1 },
        envelope: new SpendEnvelope(1.5),
      },
    );
    const cell = report.cells[0];
    expect(calls()).toBe(1);
    expect(cell.n).toBe(1);
    expect(cell.plannedN).toBe(1);
    expect(cell.envelopeExhausted).toBeUndefined();
    expect(cell.judgeIncompleteRuns).toBe(1);
    expect(cell.incompleteReason).toBe('judge-refused');
    expect(report.claims).toEqual([]);
    // The row's target status stays ok: evidence, not a passed case.
    expect(cell.caseNames).toEqual(['sweep-math']);
  });

  it('a cell refused before any work stays n=0 with zero cost', async () => {
    const { engine, calls } = fixture();
    const envelope = new SpendEnvelope(1);
    envelope.authorize(1, 'consumed elsewhere');
    const report = await runSweepMatrix(
      {
        models: [{ model: FAKE_MODEL_REF }],
        cases: [{ taskClass: 'math', case: { workflow: mathWorkflow, args: null, graders: [] } }],
      },
      { ...sweepOptions, engineFor: () => engine, suite: { budgetUsd: 0.5 }, envelope },
    );
    const cell = report.cells[0];
    expect(calls()).toBe(0);
    expect(cell.n).toBe(0);
    expect(cell.plannedN).toBe(1);
    expect(cell.totalCostUsd).toBe(0);
    expect(cell.envelopeExhausted).toBe(true);
    expect(report.claims).toEqual([]);
  });

  it('actual spend never exceeds the envelope on a priced engine', async () => {
    // The v1.17.0 review P1-4 E2E arm: with pricing wired, whatever the
    // suite actually spends stays at or below the aggregate cap,
    // because every run's immutable ceiling was authorized upfront.
    let calls = 0;
    const fake = new FakeAdapter({
      agents: {
        '*': () => {
          calls += 1;
          return { answer: 42 };
        },
      },
    });
    const engine = createEngine({
      adapters: [fake],
      stores: { journal: new InMemoryStore() },
      pricing: {
        pricingVersion: 'test-1',
        models: {
          'fake:fake-model': { inputUsdPerMTok: 1, outputUsdPerMTok: 1 },
        },
      },
      defaults: {
        routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
        profiles: { worker: {} },
      },
    });
    const envelope = new SpendEnvelope(2);
    const suite = await runEvalSuite(
      engine,
      [
        { workflow: mathWorkflow, args: null, graders: [] },
        { workflow: mathWorkflow, args: null, graders: [] },
      ],
      { budgetUsd: 1, envelope },
    );
    expect(calls).toBe(2);
    expect(suite.completedN).toBe(2);
    expect(suite.refusal).toBeUndefined();
    expect(suite.totalCostUsd).toBeGreaterThan(0);
    expect(suite.totalCostUsd).toBeLessThanOrEqual(envelope.maxTotalUsd);
    expect(envelope.authorizedUsd).toBe(2);
  });
});
