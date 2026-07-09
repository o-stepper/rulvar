/**
 * M9-T02 acceptance: an eval suite is fully deterministic under VCR
 * replay (docs/10, "M9-T02 @lurker/evals base"; docs/11, "Eval CI":
 * PR-triggered eval runs MUST execute entirely from cassettes with zero
 * live calls). Latency is the one wall-clock measurement in the report
 * and is compared for presence, not bytes.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createEngine,
  CURRENT_HASH_VERSION,
  defineWorkflow,
  InMemoryStore,
  type Engine,
  type ProviderAdapter,
} from '@lurker/core';
import { FakeAdapter, FAKE_MODEL_REF, readCassette, record, replay } from '@lurker/testing';
import { describe, expect, it } from 'vitest';

import { goldenGrader, judgeGrader, runEvalSuite, type EvalSuiteResult } from './index.js';

const ANSWER_SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'number' } },
  required: ['answer'],
  additionalProperties: false,
};

const answerWorkflow = defineWorkflow({ name: 'vcr-answer' }, async (ctx) => {
  return await ctx.agent('Compute 6*7 and answer as JSON.', {
    agentType: 'worker',
    schema: ANSWER_SCHEMA,
  });
});

const CASES = [
  {
    workflow: answerWorkflow,
    args: null,
    graders: [
      goldenGrader({ answer: 42 }),
      judgeGrader({ model: FAKE_MODEL_REF, instruction: 'the answer must be 42' }),
    ],
  },
];

function engineOver(adapters: ProviderAdapter[]): Engine {
  return createEngine({
    adapters,
    stores: { journal: new InMemoryStore() },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
      profiles: { worker: {} },
    },
  });
}

/** The deterministic projection: everything except wall-clock latency. */
function stripLatency(suite: EvalSuiteResult): unknown {
  return {
    passRate: suite.passRate,
    totalCostUsd: suite.totalCostUsd,
    results: suite.results.map(({ latencyMs, ...rest }) => {
      void latencyMs;
      return rest;
    }),
  };
}

describe('eval suite under VCR', () => {
  it('replays byte-deterministically from the cassette with zero live calls', async () => {
    const cassette = join(mkdtempSync(join(tmpdir(), 'lurker-evals-vcr-')), 'evals.jsonl');

    // Record: the suite runs against the (fake) live adapter and every
    // exchange, including the judge call, lands in the cassette.
    const fake = new FakeAdapter({
      agents: {
        worker: { answer: 42 },
        '*': { passed: true, reasoning: 'meets the instruction' },
      },
    });
    const recorded = await runEvalSuite(engineOver(record({ adapters: [fake], cassette })), CASES);
    expect(recorded.passRate).toBe(1);

    // The cassette carries its hashVersion header (DEF-6) and both
    // exchanges: the target agent call and the judge call.
    const parsed = readCassette(cassette);
    expect(parsed.header.hashVersion).toBe(CURRENT_HASH_VERSION);
    expect(parsed.rows.length).toBe(2);

    // Replay: hermetic adapters built purely from the cassette; any
    // unrecorded request would throw VcrMissError. No FakeAdapter, no
    // live surface at all.
    const replayed = await runEvalSuite(engineOver(replay({ cassette, onMiss: 'throw' })), CASES);

    expect(stripLatency(replayed)).toEqual(stripLatency(recorded));
    expect(replayed.results[0]?.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
