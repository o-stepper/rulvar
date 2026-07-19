// Records the M6 gating cassettes (M6-T11; docs/09, section 6.10):
// sandbox-determinism, planner-self-repair, orchestrator-crash-resume.
// Everything runs on the FakeAdapter: fully offline, deterministic.
//
// Imports the BUILT dists (root scripts cannot import workspace packages
// by name; docs/13). Build first:
//   corepack pnpm turbo build
//   node scripts/record-m6-cassettes.mjs
//   node scripts/check-frozen-fixtures.mjs --update
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (pkg) => import(pathToFileURL(join(root, 'packages', pkg, 'dist/index.js')).href);

const planner = await load('planner');
const testing = await load('testing');
// The recording plumbing lives on the unexported internal entry
// (v1.23.0 review): reachable by file path only, never by specifier.
const internal = await import(
  pathToFileURL(join(root, 'packages/testing/dist/internal/cassettes.js')).href
);

const workerUrl = pathToFileURL(join(root, 'packages/planner/dist/sandbox-worker.js'));
const write = (id, fixture) => {
  const path = join(root, 'cassettes', `${id}.json`);
  writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  console.log(`recorded ${id} (${fixture.entries.length} entries)`);
};

// 1. sandbox-determinism: two fresh runs must already agree at record time.
const echoAdapter = () =>
  new testing.FakeAdapter({ agents: { '*': (call) => `answer to ${call.prompt}` } });
const runA = await planner.runSandboxDeterminism({
  workerUrl,
  makeAdapter: echoAdapter,
  modelRef: testing.FAKE_MODEL_REF,
});
const runB = await planner.runSandboxDeterminism({
  workerUrl,
  makeAdapter: echoAdapter,
  modelRef: testing.FAKE_MODEL_REF,
});
if (JSON.stringify(runA) !== JSON.stringify(runB)) {
  throw new Error('sandbox-determinism: the two recording runs disagree');
}
write('sandbox-determinism', {
  id: 'sandbox-determinism',
  note:
    'M6 gate: two runs of the same CompiledWorkflow under WorkerSandboxRunner produce ' +
    'identical journals (seeded shims, JSON boundary; docs/06 8.2). Wall clock and spans ' +
    'normalized at record time; everything else is byte-exact.',
  entries: runA,
});

// 2. planner-self-repair: the failing draft round-trips through repair.
const plannerAdapter = () =>
  new testing.FakeAdapter({
    agents: {
      '*': (call) =>
        call.prompt.includes('DIAGNOSTICS (JSON)')
          ? planner.SELF_REPAIR_GOOD_DRAFT
          : planner.SELF_REPAIR_BAD_DRAFT,
    },
  });
const repair = await planner.runPlannerSelfRepair({
  makeAdapter: plannerAdapter,
  modelRef: testing.FAKE_MODEL_REF,
});
write('planner-self-repair', {
  id: 'planner-self-repair',
  note:
    'M6 gate: a mode (b) plan whose first draft fails lint (bare Date.now) round-trips ' +
    'through the self-repair loop within repairRounds and compiles; recorded on FakeAdapter ' +
    '(docs/09 6.10). The journal is the planner conversation under its goal-derived runId.',
  entries: repair.entries,
});

// 3. orchestrator-crash-resume: the pre-crash journal plus checkpoints.
const crash = await internal.recordOrchestratorCrash();
write('orchestrator-crash-resume', {
  id: 'orchestrator-crash-resume',
  note:
    'M6 gate: the orchestrator spawned two children (both settled and paid) and died before ' +
    'its terminal was written; the fixture is the cut journal plus the boundary checkpoint ' +
    'blobs. Resume must restore the transcript, find the children by content keys, and ' +
    'never re-pay or re-decide a spawn (docs/09 6.10).',
  entries: crash.entries,
  extra: { checkpoints: crash.checkpoints },
});

console.log('done; refresh the lock: node scripts/check-frozen-fixtures.mjs --update');
