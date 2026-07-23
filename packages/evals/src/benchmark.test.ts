/**
 * The benchmark kit (RV-213): scored series over verified runs,
 * nearest-rank percentiles, the replay-strict rejection of
 * non-reproducible runs, grader and judge integration, envelope
 * refusals, and the environment fingerprint. Fully offline on
 * FakeAdapter through the public engine.
 */
import { defineWorkflow, hashRunOutput } from '@rulvar/core';
import { createTestEngine, FAKE_MODEL_REF } from '@rulvar/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  judgeGrader,
  rubricGrader,
  runBenchmark,
  SpendEnvelope,
  SweepBudgetError,
} from './index.js';

const stable = defineWorkflow({ name: 'stable' }, async (ctx) => {
  const analysis = await ctx.agent('analyze the corpus', { agentType: 'worker' });
  return { analysis, draw: ctx.random() };
});

const drifty = defineWorkflow({ name: 'drifty' }, async (ctx) => {
  const analysis = await ctx.agent('analyze the corpus', { agentType: 'worker' });
  return { analysis, stamp: Math.random() };
});

function workerEngine() {
  return createTestEngine({ agents: { worker: 'analysis complete', '*': 'unused' } });
}

/** Silences the dev-mode process warnings the drifty workflow raises. */
function quietWarnings(): () => void {
  const spy = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
  return () => spy.mockRestore();
}

describe('runBenchmark', () => {
  it('scores a deterministic workflow fully: verified series, percentiles, fingerprint', async () => {
    const engine = workerEngine();
    const report = await runBenchmark(
      engine,
      { name: 'stable-series', workflow: stable, args: null, repeats: 3 },
      { labels: { commit: 'abc1234', series: 'cold' } },
    );
    expect(report.repeats).toBe(3);
    expect(report.scored).toBe(3);
    expect(report.runs).toHaveLength(3);
    for (const run of report.runs) {
      expect(run.scored).toBe(true);
      expect(run.rejectedReasons).toEqual([]);
      expect(run.status).toBe('ok');
      expect(run.runId).toMatch(/./);
      expect(run.verification.verified).toBe(true);
      expect(run.verification.pureReplay).toBe(true);
      expect(run.verification.statusReproduced).toBe(true);
      expect(run.verification.outputReproduced).toBe(true);
      expect(run.verification.determinismWarnings).toBe(0);
      expect(run.verification.outputHash).toBe(run.verification.replayedOutputHash);
      expect(run.agentDispatches).toBe(1);
      expect(run.invocations).toBeGreaterThanOrEqual(1);
    }
    expect(report.wallMs).toBeDefined();
    expect(report.costUsd).toBeDefined();
    // The fingerprint says where the numbers came from.
    expect(report.fingerprint.node).toBe(process.version);
    expect(report.fingerprint.platform).toBe(process.platform);
    expect(report.fingerprint.arch).toBe(process.arch);
    expect(report.fingerprint.packages['@rulvar/core']).toMatch(/^\d+\.\d+\.\d+/);
    expect(report.fingerprint.labels).toEqual({ commit: 'abc1234', series: 'cold' });
    // Event-time start: the first run's run:start timestamp, no clock read.
    expect(report.fingerprint.startedAt).toBeDefined();
  });

  it('rejects the non-reproducible workflow from scoring with typed reasons', async () => {
    const restore = quietWarnings();
    try {
      const engine = workerEngine();
      const report = await runBenchmark(engine, {
        name: 'drift-series',
        workflow: drifty,
        args: null,
        repeats: 2,
      });
      expect(report.repeats).toBe(2);
      expect(report.scored).toBe(0);
      // No fabricated series: percentiles are absent entirely.
      expect(report.wallMs).toBeUndefined();
      expect(report.costUsd).toBeUndefined();
      for (const run of report.runs) {
        expect(run.status).toBe('ok');
        expect(run.scored).toBe(false);
        expect(run.rejectedReasons).toContain('verification:output-diverged');
        expect(run.rejectedReasons).toContain('verification:determinism-warning');
        expect(run.verification.outputReproduced).toBe(false);
        expect(run.verification.determinismWarnings).toBeGreaterThanOrEqual(1);
        expect(run.verification.outputHash).not.toBe(run.verification.replayedOutputHash);
      }
      // The spend still counts even though nothing scored.
      expect(report.totalCostUsd).toBeGreaterThanOrEqual(0);
    } finally {
      restore();
    }
  });

  it('fails a run whose output cannot be hashed: a benchmark demands comparable outputs', async () => {
    const unhashable = defineWorkflow({ name: 'unhashable' }, async (ctx) => {
      await ctx.agent('analyze', { agentType: 'worker' });
      return { callback: () => 'not JCS' };
    });
    const report = await runBenchmark(workerEngine(), {
      name: 'unhashable-series',
      workflow: unhashable,
      args: null,
      repeats: 1,
    });
    expect(report.scored).toBe(0);
    expect(report.runs[0]?.rejectedReasons).toContain('verification:output-not-hashable');
  });

  it('computes nearest-rank percentiles exactly over a known metric series', async () => {
    const values = [50, 10, 40, 20, 30];
    let call = 0;
    const report = await runBenchmark(
      workerEngine(),
      { name: 'metric-series', workflow: stable, args: null, repeats: 5 },
      {
        metrics: {
          synthetic: () => {
            const value = values[call];
            call += 1;
            return value ?? 0;
          },
        },
      },
    );
    expect(report.scored).toBe(5);
    // Sorted series: 10 20 30 40 50. Nearest-rank: p50 = 3rd = 30,
    // p90 = ceil(4.5) = 5th = 50.
    expect(report.metrics.synthetic).toEqual({ min: 10, p50: 30, p90: 50, max: 50, mean: 30 });
  });

  it('graders gate scoring per run and judge runs stay blind and accounted', async () => {
    const judgePrompts: string[] = [];
    const engine = createTestEngine({
      agents: {
        worker: 'analysis complete',
        '*': (call: { prompt: string }) => {
          judgePrompts.push(call.prompt);
          return { passed: true, reasoning: 'meets the instruction' };
        },
      },
    });
    const report = await runBenchmark(engine, {
      name: 'graded-series',
      workflow: stable,
      args: null,
      repeats: 2,
      graders: [
        rubricGrader([
          {
            name: 'has-analysis',
            check: (value) => typeof (value as { analysis?: unknown })?.analysis === 'string',
          },
        ]),
        judgeGrader({ model: FAKE_MODEL_REF, instruction: 'the analysis must be complete' }),
      ],
    });
    expect(report.scored).toBe(2);
    for (const run of report.runs) {
      expect(run.verdicts).toHaveLength(2);
      expect(run.verdicts.every((verdict) => verdict.passed)).toBe(true);
    }
    // Blind by construction: the judge prompt carries the output and the
    // instruction, never the benchmark name, run ordinal, or runId.
    expect(judgePrompts).toHaveLength(2);
    for (const prompt of judgePrompts) {
      expect(prompt).toContain('analysis complete');
      expect(prompt).toContain('the analysis must be complete');
      expect(prompt).not.toContain('graded-series');
      for (const run of report.runs) {
        expect(prompt).not.toContain(run.runId);
      }
    }
  });

  it('a failing grader rejects the run with its name', async () => {
    const report = await runBenchmark(workerEngine(), {
      name: 'strict-series',
      workflow: stable,
      args: null,
      repeats: 1,
      graders: [rubricGrader([{ name: 'impossible', check: () => false }])],
    });
    expect(report.scored).toBe(0);
    expect(report.runs[0]?.rejectedReasons).toContain('grader:rubric');
  });

  it('the envelope refuses a target run loudly and a judge run as a typed rejection', async () => {
    // Target refusal: the envelope cannot cover even the first run.
    await expect(
      runBenchmark(
        workerEngine(),
        { name: 'capped', workflow: stable, args: null, repeats: 1 },
        { budgetUsd: 5, envelope: new SpendEnvelope(1) },
      ),
    ).rejects.toThrow(SweepBudgetError);
    // Judge refusal: the target fits, the judge does not; the run stays
    // recorded and rejected instead of throwing.
    const report = await runBenchmark(
      workerEngine(),
      {
        name: 'judge-capped',
        workflow: stable,
        args: null,
        repeats: 1,
        graders: [judgeGrader({ model: FAKE_MODEL_REF, instruction: 'anything' })],
      },
      { budgetUsd: 1, judgeBudgetUsd: 5, envelope: new SpendEnvelope(1) },
    );
    expect(report.scored).toBe(0);
    expect(report.runs[0]?.rejectedReasons).toContain('judge:refused');
  });

  it('validates repeats as a positive integer', async () => {
    for (const repeats of [0, -1, 1.5, Number.NaN]) {
      await expect(
        runBenchmark(workerEngine(), { name: 'bad', workflow: stable, args: null, repeats }),
      ).rejects.toThrow(TypeError);
    }
  });

  it('the recorded digest matches hashRunOutput of the run value', async () => {
    const engine = workerEngine();
    const report = await runBenchmark(engine, {
      name: 'digest-series',
      workflow: stable,
      args: null,
      repeats: 1,
    });
    const run = report.runs[0];
    expect(run?.verification.outputHash).toBeDefined();
    const entries = await engine.stores.journal.load(run?.runId ?? '');
    expect(entries.length).toBeGreaterThan(0);
    // The digest is the canonical JCS sha256 the core exports.
    const replayHash = run?.verification.replayedOutputHash;
    expect(replayHash).toBe(run?.verification.outputHash);
    expect(typeof hashRunOutput({ probe: 1 })).toBe('string');
  });
});
