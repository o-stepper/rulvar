// Frozen-fixture write protection (M2-T12 acceptance; docs/11, section
// "Frozen journal fixtures"): any diff to a frozen fixture fails CI
// unless an explicit hashVersion-bump changeset accompanies it.
//
// The lock file fixtures.sha256 records one sha256 per frozen file. On
// mismatch, the check scans .changeset/*.md for the literal token
// 'hashVersion-bump' (docs/10, M2-T12 acceptance); its presence marks
// the regeneration deliberate. Refresh the lock with:
//   node scripts/check-frozen-fixtures.mjs --update
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'fixtures.sha256');

/** Every frozen-fixture location; extend as later milestones freeze more. */
const FROZEN_DIRS = [
  'cassettes',
  'journals',
  'packages/testing/fixtures/frozen',
  'packages/store-conformance/src/fixtures',
];

function listFrozenFiles() {
  const files = [];
  for (const dir of FROZEN_DIRS) {
    const absolute = join(root, dir);
    if (!existsSync(absolute)) {
      continue;
    }
    for (const name of readdirSync(absolute).sort()) {
      const path = join(absolute, name);
      if (/\.(json|jsonl|ts)$/.test(name)) {
        files.push(relative(root, path));
      }
    }
  }
  return files;
}

function sha256(path) {
  return createHash('sha256')
    .update(readFileSync(join(root, path)))
    .digest('hex');
}

const current = listFrozenFiles().map((path) => `${sha256(path)}  ${path}`);

if (process.argv.includes('--update')) {
  writeFileSync(lockPath, `${current.join('\n')}\n`, 'utf8');
  console.log(`fixtures.sha256 updated (${current.length} files)`);
  process.exit(0);
}

if (!existsSync(lockPath)) {
  console.error('fixtures.sha256 is missing; run: node scripts/check-frozen-fixtures.mjs --update');
  process.exit(1);
}

const locked = readFileSync(lockPath, 'utf8').trim().split('\n').filter(Boolean);
const lockedSet = new Set(locked);
const currentSet = new Set(current);
const drifted = [
  ...locked.filter((line) => !currentSet.has(line)).map((line) => `missing or changed: ${line}`),
  ...current.filter((line) => !lockedSet.has(line)).map((line) => `new or changed:     ${line}`),
];

if (drifted.length === 0) {
  console.log(`frozen fixtures verified (${current.length} files)`);
  process.exit(0);
}

const changesetDir = join(root, '.changeset');
const hashVersionBump = existsSync(changesetDir)
  ? readdirSync(changesetDir).some(
      (name) =>
        name.endsWith('.md') &&
        name !== 'README.md' &&
        readFileSync(join(changesetDir, name), 'utf8').includes('hashVersion-bump'),
    )
  : false;

console.error('frozen fixture drift detected:');
for (const line of drifted) {
  console.error(`  ${line}`);
}
if (hashVersionBump) {
  console.error(
    '\nan accompanying changeset carries the hashVersion-bump token: regeneration is deliberate.' +
      '\nupdate the lock in the same PR: node scripts/check-frozen-fixtures.mjs --update',
  );
  process.exit(0);
}
console.error(
  '\nfrozen fixtures are the DEF-6 compatibility contract (docs/11, section "Frozen journal' +
    ' fixtures"). Regenerating them to make a test pass is forbidden. If this change is a' +
    ' deliberate identity-profile revision, ship a changeset carrying the hashVersion-bump token' +
    ' and refresh the lock: node scripts/check-frozen-fixtures.mjs --update',
);
process.exit(1);
