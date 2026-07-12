// Records the M12 ModelKnowledge phase-3 cassette (M12-T02). Fully
// offline: the scripted adapter over a plan run with kb_propose opted
// in; the quarantine assertions run inside the runner.
//
// Imports the BUILT dists (root scripts cannot import workspace packages
// by name). Build first:
//   pnpm turbo build
//   node scripts/record-m12-cassettes.mjs
//   node scripts/check-frozen-fixtures.mjs --update
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (pkg) => import(pathToFileURL(join(root, 'packages', pkg, 'dist/index.js')).href);

const plan = await load('plan');

const write = (id, note, entries) => {
  const path = join(root, 'cassettes', `${id}.json`);
  writeFileSync(path, `${JSON.stringify({ id, note, entries }, null, 2)}\n`, 'utf8');
  console.log(`recorded ${id} (${entries.length} entries)`);
};

const SCENARIOS = [
  [
    'kb-propose-quarantine',
    'M12-T02 (the historical docs/05 5.1 and 7, docs/07 4.10, FR-605): kb_propose journals ' +
      'the ENGINE-resolved proposal as an observation_add ledger.op; the injected note is ' +
      'inert (no tool result and no worker prompt carries it; ledger_read withholds the ' +
      'observation content behind a count), and nothing commits during the run (the ' +
      'runtime holds no store write path by API shape).',
    plan.runKbProposeQuarantine,
  ],
];

const keepalive = setInterval(() => undefined, 500);
try {
  for (const [id, note, runner] of SCENARIOS) {
    const first = await runner();
    const second = await runner();
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      throw new Error(`${id}: the two recording runs disagree after normalization`);
    }
    write(id, note, first);
  }
} finally {
  clearInterval(keepalive);
}
console.log('M12 cassettes recorded.');
