// Regenerates the M2 frozen fixtures (M2-T12): repo cassettes/*.json, the
// frozen v1 JSONL journal, and the v2 golden identity fixtures.
//
// Regeneration is DELIBERATE (docs/11, section "Frozen journal fixtures"):
// regenerating a frozen fixture to make a test pass is forbidden by
// policy; a diff must ship with an explicit hashVersion-bump changeset or
// scripts/check-frozen-fixtures.mjs fails CI. Requires built packages
// (`corepack pnpm exec turbo build`). After regenerating, refresh the lock:
//   node scripts/check-frozen-fixtures.mjs --update
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Root scripts resolve workspace packages through their built dist (the
// root package.json declares no workspace dependencies by design). The
// recording plumbing lives on the unexported internal entry (v1.23.0
// review): reachable by file path only, never by published specifier.
const { buildFrozenV1JournalRaw, buildM2CassetteFixtures, buildV2GoldenIdentity } = await import(
  pathToFileURL(join(root, 'packages', 'testing', 'dist', 'internal', 'cassettes.js')).href
);

const cassettesDir = join(root, 'cassettes');
mkdirSync(cassettesDir, { recursive: true });
for (const fixture of buildM2CassetteFixtures()) {
  const path = join(cassettesDir, `${fixture.id}.json`);
  writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  console.log(`wrote ${path}`);
}

const frozenDir = join(root, 'packages', 'testing', 'fixtures', 'frozen');
mkdirSync(frozenDir, { recursive: true });

const v1Path = join(frozenDir, 'v1-journal.jsonl');
const v1Lines = buildFrozenV1JournalRaw()
  .map((entry) => JSON.stringify(entry))
  .join('\n');
writeFileSync(v1Path, `${v1Lines}\n`, 'utf8');
console.log(`wrote ${v1Path}`);

const goldenPath = join(frozenDir, 'v2-golden-identity.json');
writeFileSync(goldenPath, `${JSON.stringify(buildV2GoldenIdentity(), null, 2)}\n`, 'utf8');
console.log(`wrote ${goldenPath}`);

console.log('\nfrozen fixtures regenerated; now run:');
console.log('  node scripts/check-frozen-fixtures.mjs --update');
