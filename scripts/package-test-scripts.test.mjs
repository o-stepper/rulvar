// The false green of a missing test script (RV3606). `pnpm --filter
// @rulvar/cli test` exited 0 silently for EVERY workspace package,
// because no package declared a test script and pnpm treats an absent
// script as a no-op: a targeted "run this package's tests" command was
// structurally incapable of failing. Every package holding *.test.ts
// files now declares one, delegating to the single root Vitest config
// through its project filter (docs/11 forbids per-package Vitest
// configs; the script adds an entry point, never a config), and this
// gate keeps the invariant for packages added later.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs");
// the same glob runs in CI, so a new package with tests and no test
// script fails the PR instead of shipping another silent no-op.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

/** @param {string} dir @returns {number} count of *.test.ts files under dir */
function countTestFiles(dir) {
  if (!existsSync(dir)) {
    return 0;
  }
  return readdirSync(dir, { recursive: true, withFileTypes: false }).filter((entry) =>
    String(entry).endsWith('.test.ts'),
  ).length;
}

test('every workspace package with test files declares a real test script (RV3606)', () => {
  const packageDirs = readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join('packages', entry.name))
    .filter((dir) => existsSync(join(dir, 'package.json')))
    .sort();
  assert.ok(packageDirs.length > 0, 'no workspace packages found; the gate is misconfigured');
  const offenders = [];
  for (const dir of packageDirs) {
    const testFiles = countTestFiles(join(dir, 'src'));
    if (testFiles === 0) {
      continue;
    }
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    // @rulvar/compat is published-immutable (the compat-immutability
    // gate): its packed bytes must reproduce the published artifact,
    // so its package.json cannot gain a script until a REAL compat
    // release. Its single test still runs in the root suite and via
    // `vitest run --project @rulvar/compat` directly; the filter form
    // stays a documented no-op for exactly this one package.
    if (pkg.name === '@rulvar/compat') {
      continue;
    }
    const script = pkg.scripts?.test;
    if (typeof script !== 'string' || script.length === 0) {
      offenders.push(`${pkg.name}: ${String(testFiles)} test file(s), no test script`);
      continue;
    }
    // The script must select THIS package's Vitest project: a copied
    // script running a neighbor's project is a subtler false green
    // than none at all.
    if (!script.includes(`--project ${pkg.name}`)) {
      offenders.push(`${pkg.name}: test script does not select its own project (${script})`);
    }
  }
  assert.deepEqual(offenders, []);
});
