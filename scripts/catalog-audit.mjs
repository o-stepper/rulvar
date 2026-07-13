// Catalog completeness audit (M9-T04: "Complete catalog green in one CI
// run"). Parses the canonical cassette IDs from the cassettes/CATALOG.md
// tables (extracted from the retired spec set when docs/ became the
// public documentation site) and asserts BOTH directions: every catalog
// ID resolves to a frozen fixture under cassettes/ or a named in-suite
// test ID, and every cassettes/<id>.json fixture appears in the catalog
// (an orphan fixture is an uncatalogued defect claim). Any gap fails CI
// loudly.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

// The reverse direction: a fixture file the catalog never mentions.
const orphans = readdirSync(join(root, 'cassettes'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length))
  .filter((id) => !ids.has(id))
  .sort();

// Parser-drift guard: EVERY table data row must yield an ID. This used to
// be a magic floor (`ids.size < 40`) while the catalog held 61, so a regex
// that silently stopped matching could have dropped a third of the catalog
// and still passed. A floor is a proxy for "the regex still works" that
// goes stale the moment the catalog grows; asking the real question costs
// nothing and cannot go stale, and it fails on the FIRST row it drops.
const dataRows = section
  .split('\n')
  .filter((line) => line.startsWith('|'))
  .map((line) => (line.split('|')[1] ?? '').trim())
  .filter((cell) => cell !== '' && cell !== 'Cassette' && !/^:?-{3,}:?$/.test(cell));

const unparsed = dataRows.filter((cell) => !ids.has(cell.replace(/\s*\(mandatory\)$/, '')));
if (unparsed.length > 0) {
  console.error(
    `catalog audit: cassettes/CATALOG.md has ${dataRows.length} table rows but the parser ` +
      `extracted ${ids.size} IDs; the ID regex drifted or a row is malformed:`,
  );
  for (const cell of unparsed) {
    console.error(`  - unparsed row: ${cell}`);
  }
  process.exit(1);
}
if (missing.length > 0) {
  console.error(`catalog audit FAILED: ${missing.length} catalog ID(s) have no fixture or suite:`);
  for (const id of missing) {
    console.error(`  - ${id}`);
  }
  process.exit(1);
}
if (orphans.length > 0) {
  console.error(
    `catalog audit FAILED: ${orphans.length} fixture(s) under cassettes/ missing from CATALOG.md:`,
  );
  for (const id of orphans) {
    console.error(`  - ${id}`);
  }
  process.exit(1);
}
console.log(
  `catalog audit passed: ${ids.size} catalog IDs all resolve (cassettes/ or named suites), ` +
    `0 orphan fixtures`,
);
