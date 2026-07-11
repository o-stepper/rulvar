/**
 * rulvar kb sweep e2e (M11-T05; docs/05, section "Grounding and
 * decay"): the falsification guarantee: a sweep over a store with
 * active negative claims includes those models in its matrix even when
 * the configured pool omits them; threshold-crossing cells commit
 * eval-measured claims through the committer identity; canary drift
 * flips stale before the measurement. Hermetic end to end (fake
 * adapters; the sweeps package proves record/replay separately).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { FileModelKnowledgeStore } from '@rulvar/core';
import { commitEvalMeasured } from '@rulvar/evals';

import { runCli } from './cli-main.js';
import type { CliIo } from './io.js';

interface ScriptedIo extends CliIo {
  outLines: string[];
  errLines: string[];
}

function scriptedIo(): ScriptedIo {
  const io: ScriptedIo = {
    outLines: [],
    errLines: [],
    isTTY: false,
    out: (line) => io.outLines.push(line),
    err: (line) => io.errLines.push(line),
    prompt: () => Promise.resolve(undefined),
  };
  return io;
}

const CORE_DIST = pathToFileURL(resolve(import.meta.dirname, '../../core/dist/index.js')).href;
const TESTING_DIST = pathToFileURL(
  resolve(import.meta.dirname, '../../testing/dist/index.js'),
).href;
const EVALS_DIST = pathToFileURL(resolve(import.meta.dirname, '../../evals/dist/index.js')).href;

/** The fixture: an EMPTY configured pool; the store must carry the matrix. */
function writeSweepProject(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-sweep-'));
  writeFileSync(
    join(cwd, 'rulvar.config.mjs'),
    `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};
import { goldenGrader } from ${JSON.stringify(EVALS_DIST)};

const SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'number' } },
  required: ['answer'],
  additionalProperties: false,
};
const math = defineWorkflow({ name: 'sweep-math' }, async (ctx) =>
  await ctx.agent('Compute 6*7 as JSON.', { agentType: 'worker', schema: SCHEMA }));

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { worker: { answer: 42 }, probe: 'steady output' } })],
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
      profiles: { worker: {}, probe: {} },
    },
  },
  kbSweep: {
    committerId: 'ci-evals',
    models: [],
    reportId: 'kb-sweep-test',
    canary: { agentType: 'probe', prompts: ['probe alpha'] },
    cases: [
      { taskClass: 'code-edit', case: { workflow: math, args: null, graders: [goldenGrader({ answer: 42 })] } },
    ],
  },
};
`,
    'utf8',
  );
  return cwd;
}

describe('rulvar kb sweep (M11-T05)', () => {
  it('includes negative-claim models, flips drifted claims, commits measurements', async () => {
    const cwd = writeSweepProject();
    const store = new FileModelKnowledgeStore({ path: join(cwd, 'rulvar.models.json') });
    // The store carries an ACTIVE negative eval claim for fake:model
    // with a stale canary baseline: the sweep MUST include the model
    // (falsification) and the canary MUST flip the claim first.
    await commitEvalMeasured(
      store,
      [
        {
          id: 'seed-weakness',
          subject: { model: 'fake:model' },
          taskClass: 'code-edit',
          polarity: 'weakness',
          statement: 'sweep passRate 0.40 over 5 code-edit cases: in the weakness band',
          metrics: { passRate: 0.4, n: 5, graderId: 'eval-suite' },
          confidence: 'medium',
          observedAt: new Date(Date.now() - 86_400_000).toISOString(),
          evidence: [{ kind: 'eval', reportId: 'sweep-0', caseIds: ['old'] }],
          modelEpoch: { canaryFingerprint: 'f'.repeat(64) },
        },
      ],
      { committerId: 'ci-evals', reportId: 'sweep-0' },
    );

    const io = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    // The falsification guarantee: the empty configured pool still
    // sweeps the negative-claim model.
    expect(text).toContain('pool: fake:model [falsification (active negative claim)]');
    // Canary drift flipped the seeded claim before measurement.
    expect(text).toMatch(/canary fake:model: [0-9a-f]{12}\.\.\. DRIFT, 1 claim\(s\) flipped stale/);
    // The measurement: passRate 1.00 emits a strength claim, committed.
    expect(text).toContain('cell fake:model :: code-edit: passRate 1.00 over 1 case');
    expect(text).toContain('claim kb-sweep-test/fake:model/code-edit: code-edit strength');
    expect(text).toMatch(/committed 1 claim\(s\) as store version 3 \(report kb-sweep-test\)/);

    const snapshot = await store.current();
    expect(snapshot.claims.find((claim) => claim.id === 'seed-weakness')?.status).toBe('stale');
    const fresh = snapshot.claims.find(
      (claim) => claim.id === 'kb-sweep-test/fake:model/code-edit',
    );
    expect(fresh?.class).toBe('eval-measured');
    expect(fresh?.polarity).toBe('strength');
  });

  it('fails loudly without a kbSweep config section', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-sweep-'));
    writeFileSync(join(cwd, 'rulvar.config.mjs'), 'export default {};\n', 'utf8');
    const io = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io })).toBe(1);
    expect(io.errLines.join('\n')).toContain('kbSweep section');
  });
});
