// Records the M8 gating cassette (M8-T03; docs/09 catalog section 6.9:
// queue-failover-during-forced-finish, the DEF-7 final cassette). The
// scenario runs fully offline on the scripted adapter over the REFERENCE
// LeasableStore (SqliteStore ':memory:' with an injected deterministic
// clock); the journal is deterministic after normalization.
//
// Imports the BUILT dists (root scripts cannot import workspace packages
// by name; docs/13). Build first:
//   pnpm turbo build
//   node scripts/record-m8-cassettes.mjs
//   node scripts/check-frozen-fixtures.mjs --update
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (pkg) => import(pathToFileURL(join(root, 'packages', pkg, 'dist/index.js')).href);

const plan = await load('plan');
const sqlite = await load('store-sqlite');

const write = (id, note, entries) => {
  const path = join(root, 'cassettes', `${id}.json`);
  writeFileSync(path, `${JSON.stringify({ id, note, entries }, null, 2)}\n`, 'utf8');
  console.log(`recorded ${id} (${entries.length} entries)`);
};

const deps = {
  makeStore: (now) => new sqlite.SqliteStore({ path: ':memory:', ttlMs: 60_000, now }),
};

const SCENARIOS = [
  [
    'queue-failover-during-forced-finish',
    'DEF-7 final cassette (M8-T03): worker A loses its lease strictly between the cap ' +
      'decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls ' +
      'the forced finish forward. The stale writer appends are rejected and invisible, ' +
      'exactly one cap decision exists, finalization is paid once (docs/07, 12.4; docs/03, ' +
      '12.3; docs/09, 6.9).',
    () => plan.runQueueFailoverDuringForcedFinish(deps),
  ],
];

// Cross-promise signalling has no I/O behind it: keep the event loop
// alive for the runs' duration (the M7-T14 lesson).
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
console.log('M8 cassettes recorded.');
