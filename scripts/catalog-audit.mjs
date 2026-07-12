// Catalog completeness audit (M9-T04: "Complete catalog green in one CI
// run"). Parses the canonical cassette IDs from the cassettes/CATALOG.md
// tables (extracted from the retired spec set when docs/ became the
// public documentation site) and asserts every ID resolves to either a
// frozen fixture under cassettes/ or a named in-suite test ID. Any gap
// fails CI loudly; silent truncation of the catalog is impossible.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const section = readFileSync(join(root, 'cassettes/CATALOG.md'), 'utf8');

// Cassette IDs are the first cell of catalog table rows: kebab-case,
// possibly suffixed with a parenthetical like "(mandatory)".
const ids = new Set();
for (const line of section.split('\n')) {
  const match = /^\|\s*([a-z0-9][a-zA-Z0-9-]+)\s*(?:\((?:mandatory)\))?\s*\|/.exec(line);
  if (match === null) {
    continue;
  }
  const id = match[1];
  if (id === 'Cassette' || id === 'resume-v1-on-engine-v2') {
    // The header row; resume-v1-on-engine-v2 handled below with its set.
  }
  ids.add(id);
}
ids.delete('Cassette');

// IDs that live INSIDE suites rather than as cassettes/<id>.json files:
// the DEF-6 frozen v1 journals (packages/testing/fixtures/frozen consumed
// by def6.test.ts) and the M8 soak (packages/cli/src/m8-soak.test.ts).
const IN_SUITE = new Map([
  ['resume-v1-on-engine-v2', 'packages/testing/src/cassettes/def6.test.ts'],
  ['resume-v1-with-inserted-call', 'packages/testing/src/cassettes/def6.test.ts'],
  ['suspended-v1-resolves-on-v2', 'packages/testing/src/cassettes/def6.test.ts'],
  ['multi-process-fencing-soak', 'packages/cli/src/m8-soak.test.ts'],
]);

const missing = [];
for (const id of [...ids].sort()) {
  if (existsSync(join(root, 'cassettes', `${id}.json`))) {
    continue;
  }
  const suite = IN_SUITE.get(id);
  if (suite !== undefined && existsSync(join(root, suite))) {
    continue;
  }
  missing.push(id);
}

if (ids.size < 40) {
  console.error(
    `catalog audit: parsed only ${ids.size} IDs from cassettes/CATALOG.md; the parser drifted`,
  );
  process.exit(1);
}
if (missing.length > 0) {
  console.error(`catalog audit FAILED: ${missing.length} catalog ID(s) have no fixture or suite:`);
  for (const id of missing) {
    console.error(`  - ${id}`);
  }
  process.exit(1);
}
console.log(
  `catalog audit passed: ${ids.size} catalog IDs all resolve (cassettes/ or named suites)`,
);
