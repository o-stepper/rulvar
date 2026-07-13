// Frozen-fixture write protection (M2-T12 acceptance; docs/11, section
// "Frozen journal fixtures"): the tree must ALWAYS match the committed
// lock, so a fixture edit with a stale lock fails CI with or without
// ceremony. The ceremony gates the lock refresh instead: --update
// refuses to run unless a .changeset/*.md carries the literal token
// 'hashVersion-bump' (docs/10, M2-T12 acceptance), so a deliberate
// identity-profile revision ships as fixture diff + lock diff +
// token-carrying changeset in one reviewable PR. Refresh with:
//   node scripts/check-frozen-fixtures.mjs --update
// The scan is recursive: a subdirectory added under a frozen root is
// frozen too.
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

/**
 * NOT frozen: the provider VCR cassettes the weekly live contract run
 * re-sends (cassettes/vcr). Their bytes never enter replay identity, and
 * rerecording them is a routine, deliberate operation
 * (scripts/record-provider-cassettes.mjs refuses to overwrite, so a
 * rerecord is a whole-file diff under review). Freezing them would demand
 * the hashVersion-bump ceremony, which asserts an identity-profile
 * revision, for a change that revises no identity.
 */
const EXCLUDED_SUBTREES = new Set(['cassettes/vcr']);

function collectFrozen(absolute, files) {
  for (const entry of readdirSync(absolute, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_SUBTREES.has(relative(root, path))) {
        continue;
      }
      collectFrozen(path, files);
    } else if (/\.(json|jsonl|ts)$/.test(entry.name)) {
      files.push(relative(root, path));
    }
  }
}

function listFrozenFiles() {
  const files = [];
  for (const dir of FROZEN_DIRS) {
    const absolute = join(root, dir);
    if (!existsSync(absolute)) {
      continue;
    }
    collectFrozen(absolute, files);
  }
  return files;
}

function changesetsCarryBumpToken() {
  const changesetDir = join(root, '.changeset');
  return existsSync(changesetDir)
    ? readdirSync(changesetDir).some(
        (name) =>
          name.endsWith('.md') &&
          name !== 'README.md' &&
          readFileSync(join(changesetDir, name), 'utf8').includes('hashVersion-bump'),
      )
    : false;
}

function sha256(path) {
  return createHash('sha256')
    .update(readFileSync(join(root, path)))
    .digest('hex');
}

const current = listFrozenFiles().map((path) => `${sha256(path)}  ${path}`);

if (process.argv.includes('--update')) {
  if (existsSync(lockPath) && !changesetsCarryBumpToken()) {
    console.error(
      'refusing to refresh fixtures.sha256: no .changeset/*.md carries the hashVersion-bump ' +
        'token. Frozen fixtures are the DEF-6 compatibility contract; ship the token-carrying ' +
        'changeset first, then rerun with --update.',
    );
    process.exit(1);
  }
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

console.error('frozen fixture drift detected:');
for (const line of drifted) {
  console.error(`  ${line}`);
}
if (changesetsCarryBumpToken()) {
  console.error(
    '\nan accompanying changeset carries the hashVersion-bump token: regeneration is' +
      ' authorized, but the lock must land in the same PR. Refresh it and commit:' +
      ' node scripts/check-frozen-fixtures.mjs --update',
  );
  process.exit(1);
}
console.error(
  '\nfrozen fixtures are the DEF-6 compatibility contract (docs/11, section "Frozen journal' +
    ' fixtures"). Regenerating them to make a test pass is forbidden. If this change is a' +
    ' deliberate identity-profile revision, ship a changeset carrying the hashVersion-bump token' +
    ' and refresh the lock: node scripts/check-frozen-fixtures.mjs --update',
);
process.exit(1);
