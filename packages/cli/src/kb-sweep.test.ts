/**
 * rulvar kb sweep e2e (M11-T05): the falsification guarantee: a sweep
 * over a store with
 * active negative claims includes those models in its matrix even when
 * the configured pool omits them; threshold-crossing cells commit
 * eval-measured claims through the committer identity; canary drift
 * flips stale before the measurement. Hermetic end to end (fake
 * adapters; the sweeps package proves record/replay separately).
 *
 * The v1.16.2 review P1-2 (CLI side): a sweep runs paid target, judge,
 * and canary runs, so it carries immutable per-run ceilings and an
 * aggregate debit-only envelope, or the config waives them explicitly.
 * These tests prove the wiring end to end: ceilings reach every
 * RunMeta, the maxTotalUsd envelope refuses over-budget runs before any
 * provider call, and a sweep with neither budgets nor allowUnbounded
 * fails loudly.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

// Distinct per-run ceilings so a RunMeta's budget names its origin.
// Each is above the engine's per-call admission reserve (~$0.50 for the
// unpriced FakeAdapter) so canary and target runs settle ok rather than
// exhausting on admission.
const BOUNDED_BUDGETS = 'budgets: { targetUsd: 0.75, judgeUsd: 0.6, canaryUsd: 0.5, maxTotalUsd: 100 },';

/**
 * The fixture: an EMPTY configured pool; the store must carry the
 * matrix. The sweep engines write to a real JSONL journal under
 * .rulvar-sweep so a test can read each run's recorded ceiling. The
 * budget clause is injected verbatim (bounded, tiny-envelope, or
 * allowUnbounded).
 */
function writeSweepProject(budgetClause: string = BOUNDED_BUDGETS): {
  cwd: string;
  journalDir: string;
} {
  const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-sweep-'));
  const journalDir = join(cwd, '.rulvar-sweep');
  writeFileSync(
    join(cwd, 'rulvar.config.mjs'),
    `import { createEngine, defineWorkflow, JsonlFileStore } from ${JSON.stringify(CORE_DIST)};
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

const adapter = new FakeAdapter({ agents: { worker: { answer: 42 }, probe: 'steady output' } });

export default {
  engineOptions: {
    adapters: [adapter],
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
    engineFor: (member) =>
      createEngine({
        adapters: [adapter],
        stores: { journal: new JsonlFileStore({ dir: ${JSON.stringify(journalDir)} }) },
        defaults: { routing: { loop: member.model, extract: member.model }, profiles: { worker: {}, probe: {} } },
      }),
    ${budgetClause}
    cases: [
      { taskClass: 'code-edit', case: { workflow: math, args: null, graders: [goldenGrader({ answer: 42 })] } },
    ],
  },
};
`,
    'utf8',
  );
  return { cwd, journalDir };
}

/** Reads every RunMeta the sweep engines wrote to the journal dir. */
function readMetas(journalDir: string): Array<{ budgetUsd?: number; workflowName?: string }> {
  if (!existsSync(journalDir)) {
    return [];
  }
  return readdirSync(journalDir)
    .filter((file) => file.endsWith('.meta.json'))
    .map(
      (file) =>
        JSON.parse(readFileSync(join(journalDir, file), 'utf8')) as {
          budgetUsd?: number;
          workflowName?: string;
        },
    );
}

/** Seeds an active negative eval claim with a stale canary baseline. */
async function seedWeakness(store: FileModelKnowledgeStore): Promise<void> {
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
}

describe('rulvar kb sweep (M11-T05)', () => {
  it('includes negative-claim models, flips drifted claims, commits measurements', async () => {
    const { cwd, journalDir } = writeSweepProject();
    const store = new FileModelKnowledgeStore({ path: join(cwd, 'rulvar.models.json') });
    // The store carries an ACTIVE negative eval claim for fake:model
    // with a stale canary baseline: the sweep MUST include the model
    // (falsification) and the canary MUST flip the claim first.
    await seedWeakness(store);

    const io = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    // The budget pre-flight prints the hard ceiling and worst-case
    // target+canary authorization before any provider call.
    expect(text).toContain('sweep budget: $100 maxTotalUsd hard ceiling');
    expect(text).toContain('authorizes up to $1.25 for 1 canary + 1 target run(s)');
    // The falsification guarantee: the empty configured pool still
    // sweeps the negative-claim model.
    expect(text).toContain('pool: fake:model [falsification (active negative claim)]');
    // Canary drift flipped the seeded claim before measurement.
    expect(text).toMatch(/canary fake:model: [0-9a-f]{12}\.\.\. DRIFT, 1 claim\(s\) flipped stale/);
    // The measurement: passRate 1.00 emits a strength claim, committed.
    expect(text).toContain('cell fake:model :: code-edit: passRate 1.00 over 1 case');
    expect(text).toContain('claim kb-sweep-test/fake:model/code-edit: code-edit strength');
    expect(text).toMatch(/committed 1 claim\(s\) as store version 3 \(report kb-sweep-test\)/);
    // The envelope's closing draw is reported (canary 0.5 + target 0.75).
    expect(text).toMatch(/sweep budget: authorized \$1\.25 of \$100/);

    // Acceptance #1: every canary and target RunMeta carries its
    // immutable ceiling, distinct per run kind.
    const metas = readMetas(journalDir);
    const canaryMeta = metas.find((meta) => meta.workflowName === 'kb-canary:0');
    const targetMeta = metas.find((meta) => meta.workflowName === 'sweep-math');
    expect(canaryMeta?.budgetUsd).toBe(0.5);
    expect(targetMeta?.budgetUsd).toBe(0.75);

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

  it('fails loudly when neither budgets nor allowUnbounded is set', async () => {
    // The budget clause is omitted entirely: no ceilings, no waiver.
    const { cwd } = writeSweepProject('');
    const io = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io })).toBe(1);
    const err = io.errLines.join('\n');
    expect(err).toContain('kbSweep.budgets');
    expect(err).toContain('kbSweep.allowUnbounded: true');
    // Refused before any provider work: no pool line, no canary line.
    expect(io.outLines.join('\n')).not.toContain('pool:');
  });

  it('rejects a non-positive budget field before any run', async () => {
    const { cwd } = writeSweepProject(
      'budgets: { targetUsd: 0.5, judgeUsd: 0.5, canaryUsd: 0, maxTotalUsd: 100 },',
    );
    const io = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io })).toBe(1);
    expect(io.errLines.join('\n')).toContain('kbSweep.budgets.canaryUsd must be a positive');
  });

  it('runs unbounded only with an explicit waiver, warning and setting no ceiling', async () => {
    const { cwd, journalDir } = writeSweepProject('allowUnbounded: true,');
    const store = new FileModelKnowledgeStore({ path: join(cwd, 'rulvar.models.json') });
    await seedWeakness(store);
    const io = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io })).toBe(0);
    expect(io.errLines.join('\n')).toContain('running UNBOUNDED');
    // No budget pre-flight, no envelope draw.
    expect(io.outLines.join('\n')).not.toContain('sweep budget:');
    // The runs carry no ceiling.
    const metas = readMetas(journalDir);
    const canaryMeta = metas.find((meta) => meta.workflowName === 'kb-canary:0');
    const targetMeta = metas.find((meta) => meta.workflowName === 'sweep-math');
    expect(canaryMeta?.budgetUsd).toBeUndefined();
    expect(targetMeta?.budgetUsd).toBeUndefined();
  });

  it('refuses over-envelope runs before any provider call and commits nothing', async () => {
    // maxTotalUsd below a single run's ceiling: the canary probe and
    // the target both fail authorization before starting.
    const { cwd, journalDir } = writeSweepProject(
      'budgets: { targetUsd: 1, judgeUsd: 1, canaryUsd: 1, maxTotalUsd: 0.1 },',
    );
    const store = new FileModelKnowledgeStore({ path: join(cwd, 'rulvar.models.json') });
    await seedWeakness(store);
    const io = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    expect(text).toContain('canary fake:model: envelope exhausted, skipped');
    expect(text).toContain('cell fake:model :: code-edit: envelope exhausted, not measured');
    expect(text).toContain('no claims crossed a threshold; nothing committed');
    // Zero provider work happened: no run reached the journal, and the
    // seeded weakness was never flipped (allOk gate never ran).
    expect(readMetas(journalDir)).toHaveLength(0);
    const snapshot = await store.current();
    expect(snapshot.claims.find((claim) => claim.id === 'seed-weakness')?.status).toBe('active');
  });
});
