// Regenerates the LIVE-RECORDED cassettes: the M3-T11 DEF-1 live set
// (escalate-replay, crash-between-report-and-decision, flavor-b-timeout),
// the M2 DEF-1 subset re-recorded through the live runtime
// (abandon-subtree, memoize-classifier), and the M4-T08 DEF-6
// effort-defaults-shift (the frozen v1 prefix resumed live under the
// completed effort semantics).
//
// Regeneration is DELIBERATE (docs/11, section "Frozen journal
// fixtures"). Requires built packages (`corepack pnpm exec turbo build`).
// After regenerating, refresh the lock:
//   node scripts/check-frozen-fixtures.mjs --update
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Root scripts resolve workspace packages through their built dist (the
// root package.json declares no workspace dependencies by design). The
// recording plumbing lives on the unexported internal entry (v1.23.0
// review): reachable by file path only, never by published specifier.
const { recordLiveCassettes } = await import(
  pathToFileURL(join(root, 'packages', 'testing', 'dist', 'internal', 'cassettes.js')).href
);

const cassettesDir = join(root, 'cassettes');
mkdirSync(cassettesDir, { recursive: true });
for (const fixture of await recordLiveCassettes()) {
  const path = join(cassettesDir, `${fixture.id}.json`);
  writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  console.log(`wrote ${path}`);
}

console.log('\nlive cassettes regenerated; now run:');
console.log('  node scripts/check-frozen-fixtures.mjs --update');
