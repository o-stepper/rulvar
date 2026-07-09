/**
 * M9-T02 self-tests on FakeAdapter (docs/10, "M9-T02 @lurker/evals base"):
 * the three grader families, judge-through-the-engine, suite aggregation
 * with duplicate-name disambiguation, and the config-matrix comparison.
 */
import { defineWorkflow, type Json } from '@lurker/core';
import { createTestEngine, FAKE_MODEL_REF } from '@lurker/testing';
import { describe, expect, it } from 'vitest';

import {
  goldenGrader,
  judgeGrader,
  rubricGrader,
  runEvalCase,
  runEvalMatrix,
  runEvalSuite,
} from './index.js';

const ANSWER_SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'number' } },
  required: ['answer'],
  additionalProperties: false,
};

const answerWorkflow = defineWorkflow({ name: 'answer' }, async (ctx) => {
  return await ctx.agent('Compute 6*7 and answer as JSON.', {
    agentType: 'worker',
    schema: ANSWER_SCHEMA,
  });
});

function workerEngine(respondWith: Json, judgeVerdict?: Json) {
  return createTestEngine({
    agents: {
      worker: respondWith as object,
      '*': (judgeVerdict ?? { passed: true, reasoning: 'meets the instruction' }) as object,
    },
  });
}

describe('runEvalCase', () => {
  it('passes a case whose golden, rubric, and judge graders all pass', async () => {
    const engine = workerEngine({ answer: 42 });
    const result = await runEvalCase(engine, {
      workflow: answerWorkflow,
      args: null,
      graders: [
        goldenGrader({ answer: 42 }),
        rubricGrader([
          {
            name: 'has-answer',
            check: (v) => typeof (v as { answer?: unknown })?.answer === 'number',
          },
          { name: 'is-42', check: (v) => (v as { answer?: unknown })?.answer === 42 },
        ]),
        judgeGrader({ model: FAKE_MODEL_REF, instruction: 'the answer must be 42' }),
      ],
    });

    expect(result.status).toBe('ok');
    expect(result.passed).toBe(true);
    expect(result.verdicts.map((v) => [v.grader, v.passed])).toEqual([
      ['golden', true],
      ['rubric', true],
      ['judge', true],
    ]);
    expect(result.verdicts[1]?.score).toBe(1);
    expect(result.verdicts[2]?.details).toEqual({
      output: { passed: true, reasoning: 'meets the instruction' },
    });
    // FakeAdapter calls cost zero USD but usage flows.
    expect(result.costUsd).toBe(0);
    expect(result.judgeCostUsd).toBe(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  });

  it('fails on a golden mismatch and reports the diff evidence', async () => {
    const engine = workerEngine({ answer: 41 });
    const result = await runEvalCase(engine, {
      workflow: answerWorkflow,
      args: null,
      graders: [goldenGrader({ answer: 42 })],
    });
    expect(result.passed).toBe(false);
    expect(result.verdicts[0]).toEqual({
      grader: 'golden',
      passed: false,
      details: { expected: { answer: 42 }, actual: { answer: 41 } },
    });
  });

  it('scores rubric fractions against the pass threshold', async () => {
    const engine = workerEngine({ answer: 41 });
    const result = await runEvalCase(engine, {
      workflow: answerWorkflow,
      args: null,
      graders: [
        rubricGrader(
          [
            {
              name: 'has-answer',
              check: (v) => typeof (v as { answer?: unknown })?.answer === 'number',
            },
            { name: 'is-42', check: (v) => (v as { answer?: unknown })?.answer === 42 },
          ],
          { passThreshold: 0.5 },
        ),
      ],
    });
    expect(result.verdicts[0]?.score).toBe(0.5);
    expect(result.verdicts[0]?.passed).toBe(true);
    expect(result.verdicts[0]?.details).toEqual({
      criteria: [
        { name: 'has-answer', passed: true },
        { name: 'is-42', passed: false },
      ],
    });
  });

  it('judges through the engine: the judge call is journaled in its own run', async () => {
    const engine = workerEngine({ answer: 42 });
    const judged = await runEvalCase(engine, {
      workflow: answerWorkflow,
      args: null,
      graders: [judgeGrader({ model: FAKE_MODEL_REF, instruction: 'must be 42' })],
    });
    expect(judged.passed).toBe(true);
    // Two runs hit the store: the target and the judge.
    const runs = await engine.store.listRuns();
    expect(runs.length).toBe(2);
  });

  it('skips judge invocations deterministically when the target run is not ok', async () => {
    const engine = createTestEngine({
      agents: {
        worker: () => {
          throw new Error('deliberate target failure');
        },
        '*': () => {
          throw new Error('the judge must never be invoked for a failed target');
        },
      },
    });
    const result = await runEvalCase(engine, {
      workflow: answerWorkflow,
      args: null,
      graders: [judgeGrader({ model: FAKE_MODEL_REF, instruction: 'unused' })],
    });
    expect(result.status).toBe('error');
    expect(result.passed).toBe(false);
    expect(result.verdicts[0]?.passed).toBe(false);
    expect(result.verdicts[0]?.details).toEqual({ skipped: "target run settled 'error'" });
  });
});

describe('runEvalSuite', () => {
  it('aggregates pass rate and disambiguates duplicate workflow names', async () => {
    const engine = workerEngine({ answer: 42 });
    const suite = await runEvalSuite(engine, [
      { workflow: answerWorkflow, args: null, graders: [goldenGrader({ answer: 42 })] },
      { workflow: answerWorkflow, args: null, graders: [goldenGrader({ answer: 43 })] },
    ]);
    expect(suite.results.map((r) => r.name)).toEqual(['answer', 'answer#1']);
    expect(suite.results.map((r) => r.passed)).toEqual([true, false]);
    expect(suite.passRate).toBe(0.5);
    expect(suite.totalCostUsd).toBe(0);
    expect(suite.meanLatencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('runEvalMatrix', () => {
  it('compares configurations cell by cell in declaration order', async () => {
    const cases = [
      { workflow: answerWorkflow, args: null as Json, graders: [goldenGrader({ answer: 42 })] },
    ];
    const report = await runEvalMatrix(
      [
        { name: 'cheap-workers', engine: () => workerEngine({ answer: 41 }) },
        { name: 'premium-workers', engine: () => workerEngine({ answer: 42 }) },
      ],
      cases,
    );
    expect(report.cells.map((cell) => [cell.cell, cell.passRate])).toEqual([
      ['cheap-workers', 0],
      ['premium-workers', 1],
    ]);
    expect(report.cells[0]?.results[0]?.verdicts[0]?.passed).toBe(false);
    expect(report.cells[1]?.results[0]?.verdicts[0]?.passed).toBe(true);
  });
});
