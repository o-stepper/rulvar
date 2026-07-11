// The live M12 measured-value checkpoint (M12-T01; docs/05 section
// "Phases and placement"; the OQ-09 criteria; the OQ-28 grant: $15
// one-off, Anthropic keys only). Root scripts import built dists
// (docs/13). Run:
//
//   pnpm turbo build
//   ANTHROPIC_API_KEY=... node scripts/run-value-checkpoint.mjs
//
// Flow: (1) the seeding sweep measures every ladder rung on the SEED
// half of the fixed corpus and commits eval-measured claims through
// the committer identity into a scratch store; (2) runValueCheckpoint
// A/Bs the EVAL half per (ladder, taskClass) cell (default tier versus
// the compiled recommendation) and the orchestrated cases with and
// without the card; (3) the report lands in tmp/ as JSON plus the
// docs-ready markdown render. Every run carries an engine budget
// ceiling and the script aborts if cumulative spend crosses the guard.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildCorpus, buildOrchestratedSpecs } from './checkpoint-corpus.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (pkg) => import(pathToFileURL(join(root, 'packages', pkg, 'dist/index.js')).href);

const core = await load('core');
const evals = await load('evals');
const { anthropic } = await load('anthropic');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set; the live checkpoint cannot run.');
  process.exit(2);
}

const HAIKU = 'anthropic:claude-haiku-4-5-20251001';
const SONNET = 'anthropic:claude-sonnet-5';
const SPEND_GUARD_USD = 12; // under the $15 OQ-28 grant, with retry headroom
const CASE_BUDGET_USD = 0.1; // per-run engine ceiling (dogfooding DEF-7)

const LADDERS = [
  {
    name: 'swift',
    startTier: 1,
    rungs: [
      { model: HAIKU, effort: 'medium' },
      { model: SONNET, effort: 'medium' },
    ],
  },
  {
    name: 'deep',
    startTier: 1,
    rungs: [
      { model: HAIKU, effort: 'high' },
      { model: SONNET, effort: 'high' },
    ],
  },
];

const OUT_SCHEMA = {
  type: 'object',
  properties: {
    vendor: { type: 'string' },
    total: { type: 'number' },
    currency: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    city: { type: 'string' },
    level: { type: 'string' },
    code: { type: 'number' },
    service: { type: 'string' },
    result: {},
    verdict: { type: 'string' },
  },
  additionalProperties: true,
};

function toEvalCase({ taskClass, spec }) {
  return {
    taskClass,
    case: {
      workflow: core.defineWorkflow({ name: spec.name }, async (ctx) => {
        return await ctx.agent(spec.prompt, { agentType: 'worker', schema: OUT_SCHEMA });
      }),
      args: null,
      graders: [evals.goldenGrader(spec.golden)],
    },
  };
}

function memberEngine(member) {
  return core.createEngine({
    adapters: [anthropic()],
    stores: { journal: new core.InMemoryStore() },
    defaults: {
      routing: { loop: member.model, extract: member.model },
      profiles: { worker: { effort: member.effort } },
    },
  });
}

let spentUsd = 0;
const guard = (label, addUsd) => {
  spentUsd += addUsd;
  console.log(`[spend] ${label}: +$${addUsd.toFixed(4)} (total $${spentUsd.toFixed(4)})`);
  if (spentUsd > SPEND_GUARD_USD) {
    console.error(`SPEND GUARD tripped at $${spentUsd.toFixed(2)} > $${String(SPEND_GUARD_USD)}`);
    process.exit(3);
  }
};

const observedAt = new Date().toISOString();
const scratch = join(root, 'tmp', 'checkpoint');
mkdirSync(scratch, { recursive: true });
rmSync(join(scratch, 'rulvar.models.json'), { force: true }); // a fresh store per invocation: stale claims from prior runs must not leak
const store = new core.FileModelKnowledgeStore({ path: join(scratch, 'rulvar.models.json') });

const { seed, evalHalf } = buildCorpus({ seedCount: 10, evalCount: 20 });
console.log(
  `corpus: ${String(seed.length)} seed + ${String(evalHalf.length)} eval cases across 3 classes`,
);

// Stage 1: the seeding sweep over every distinct rung member.
const members = [];
for (const ladder of LADDERS) {
  for (const rung of ladder.rungs) {
    if (!members.some((m) => m.model === rung.model && m.effort === rung.effort)) {
      members.push(rung);
    }
  }
}
const sweep = await evals.runSweepMatrix(
  { models: members, cases: seed.map(toEvalCase) },
  {
    reportId: `checkpoint-seed-${observedAt}`,
    committerId: 'founder-checkpoint',
    observedAt,
    engineFor: memberEngine,
    suite: { budgetUsd: CASE_BUDGET_USD },
    store,
    thresholds: { strength: 0.85, weakness: 0.6 },
  },
);
for (const cell of sweep.cells) {
  console.log(
    `[seed] ${cell.model}@${cell.effort ?? 'default'} :: ${cell.taskClass}: ` +
      `passRate ${cell.passRate.toFixed(2)} over ${String(cell.n)} ($${cell.totalCostUsd.toFixed(4)})`,
  );
}
guard(
  'seeding sweep',
  sweep.cells.reduce((sum, cell) => sum + cell.totalCostUsd, 0),
);
console.log(
  `[seed] ${String(sweep.claims.length)} eval-measured claims committed ` +
    `(store version ${String(sweep.committedVersion ?? 0)})`,
);

// Stage 2: the checkpoint proper.
const snapshot = await store.current();
const orchestratedSpecs = buildOrchestratedSpecs();

function orchestrateEngine(withKnowledge) {
  return core.createEngine({
    adapters: [anthropic()],
    stores: {
      journal: new core.InMemoryStore(),
      ...(withKnowledge ? { modelKnowledge: store } : {}),
    },
    defaults: {
      routing: { loop: `${HAIKU}`, orchestrate: SONNET },
      profiles: {
        fast: { description: 'quick worker on the cheap tier', model: HAIKU },
        careful: { description: 'careful worker on the strong tier', model: SONNET },
        // The declared ladders make claim subjects reachable for the
        // card; they are never spawned (the kb cassette pattern).
        swiftLadder: {
          description: 'declared ladder swift',
          model: {
            ladder: {
              rungs: LADDERS[0].rungs.map((r) => ({ ...r, maxTurns: 6, maxTokens: 4096 })),
              startTier: 1,
              escalateOn: ['error'],
            },
          },
        },
        deepLadder: {
          description: 'declared ladder deep',
          model: {
            ladder: {
              rungs: LADDERS[1].rungs.map((r) => ({ ...r, maxTurns: 6, maxTokens: 4096 })),
              startTier: 1,
              escalateOn: ['error'],
            },
          },
        },
      },
    },
  });
}

const report = await evals.runValueCheckpoint(
  { ladders: LADDERS, evalCases: evalHalf.map(toEvalCase) },
  {
    snapshot,
    observedAt,
    engineFor: memberEngine,
    suite: { budgetUsd: CASE_BUDGET_USD },
    orchestrateEngineFor: orchestrateEngine,
    orchestratedCases: orchestratedSpecs.map((spec) => ({
      case: {
        workflow: core.makeOrchestratorWorkflow(spec.goal, {
          profiles: ['fast', 'careful', 'swiftLadder', 'deepLadder'],
        }),
        args: undefined,
        graders: [evals.goldenGrader(spec.golden)],
      },
    })),
  },
);
guard(
  'checkpoint cells',
  report.criterion1.pooledBaseline.totalCostUsd + report.criterion1.pooledTreatment.totalCostUsd,
);
if (report.criterion2) {
  guard(
    'orchestrated arms',
    report.criterion2.baseline.totalCostUsd + report.criterion2.informed.totalCostUsd,
  );
}

const rendered = evals.renderCheckpointReport(report);
writeFileSync(join(root, 'tmp', 'checkpoint-report.json'), JSON.stringify(report, null, 2));
writeFileSync(
  join(root, 'tmp', 'checkpoint-report.md'),
  `${rendered}\n\nTotal spend: $${spentUsd.toFixed(4)}\n`,
);
console.log('\n' + rendered);
console.log(`\nTotal spend: $${spentUsd.toFixed(4)}; artifacts in tmp/checkpoint-report.{json,md}`);
process.exit(report.passed ? 0 : 1);
