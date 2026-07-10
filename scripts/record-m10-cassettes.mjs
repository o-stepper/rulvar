// Records the M10 ModelKnowledge phase-1 cassettes (M10-T03; docs/09,
// section 6.11). Fully offline: the scripted adapter plus a
// deterministic stub knowledge store with time-stable claim dates.
//
// Imports the BUILT dists (root scripts cannot import workspace packages
// by name; docs/13). Build first:
//   pnpm turbo build
//   node scripts/record-m10-cassettes.mjs
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
    'kb-pin-replay',
    'M10 (docs/05, 4.1/4.2): an orchestrate-role run over a configured ModelKnowledgeStore ' +
      'pins the filtered card at admission (kb_pinned with the card bytes embedded) and ' +
      'repins at the wait_for_events wake (kb_repinned); the card is tier-relative and ' +
      'carries no model names; replay reads entry bytes only, never the live store.',
    plan.runKbPinReplay,
  ],
  [
    'kb-repin-expiry',
    'M10 (docs/05, 4.2): the repin re-applies the read-path filters against a FRESH store ' +
      'read; a claim archived between the pin and the wake vanishes from the repinned card ' +
      'while the boot pin bytes stand untouched (expired and archived claims never steer ' +
      'spawns after pauses).',
    plan.runKbRepinExpiry,
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
console.log('M10 cassettes recorded.');
