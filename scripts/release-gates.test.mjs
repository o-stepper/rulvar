// The release gate ORDER is the acceptance (RV4306): a coverage gate
// that runs after changesets/action guards nothing, and a contract
// gate that reads after publish reads too late. These assertions parse
// the workflow text, so a refactor that reorders the steps turns red
// here instead of on a live train.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const releaseYml = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
const contractYml = readFileSync(join(root, '.github/workflows/contract-tests.yml'), 'utf8');
const coverageYml = readFileSync(join(root, '.github/workflows/coverage.yml'), 'utf8');
const ciYml = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');

test('release.yml runs coverage strictly BEFORE the changesets/action publish step', () => {
  const coverageAt = releaseYml.indexOf('vitest run --coverage');
  const publishAt = releaseYml.indexOf('uses: changesets/action');
  assert.ok(coverageAt > 0, 'the coverage invocation exists');
  assert.ok(publishAt > 0, 'the publish step exists');
  assert.ok(coverageAt < publishAt, 'coverage must precede the publish step');
});

test('release.yml reads the contract classification BEFORE publish and never launches', () => {
  const gateAt = releaseYml.indexOf('release-contract-gate.mjs');
  const publishAt = releaseYml.indexOf('uses: changesets/action');
  assert.ok(gateAt > 0, 'the contract gate step exists');
  assert.ok(gateAt < publishAt, 'the gate must precede the publish step');
  assert.match(releaseYml, /Read the live-contract classification \(never launch\)/);
  assert.doesNotMatch(releaseYml, /workflow_dispatch.*contract-tests/s);
});

test('release.yml carries the postgres rig so the coverage gate judges the full program', () => {
  assert.match(releaseYml, /RULVAR_POSTGRES_URL: postgres:\/\/postgres:rulvar@127\.0\.0\.1:5432/);
  assert.match(releaseYml, /image: postgres:16/);
});

test('release.yml computes registry tarball digests into the release notes after publish', () => {
  const digestsAt = releaseYml.indexOf('release-registry-digests.mjs');
  const publishAt = releaseYml.indexOf('uses: changesets/action');
  assert.ok(digestsAt > publishAt, 'digests read the registry AFTER the publish step');
  assert.match(releaseYml, /--notes-file/);
});

test('contract-tests.yml has no job-level enablement if and always uploads the classification', () => {
  // The old job-level `if` left a disabled program with NO record at
  // all, indistinguishable from a broken cron.
  assert.doesNotMatch(contractYml, /^\s{4}if: vars\.CONTRACT_TESTS_ENABLED/m);
  assert.match(contractYml, /contract-classification\.mjs init/);
  assert.match(contractYml, /--classification-out contract-classification\.json/);
  assert.match(contractYml, /name: contract-classification/);
  assert.match(contractYml, /upload-artifact/);
  // The heavy paid steps stay behind the variable at STEP level.
  assert.match(contractYml, /if: vars\.CONTRACT_TESTS_ENABLED == 'true'/);
});

test('coverage runs as its own scheduled workflow, never a schedule on the whole ci matrix', () => {
  assert.match(coverageYml, /schedule:/);
  assert.match(coverageYml, /vitest run --coverage/);
  assert.doesNotMatch(ciYml, /schedule:/);
});

test('the gate names the legacy migration window instead of mandating spend', () => {
  const gate = readFileSync(join(root, 'scripts/release-contract-gate.mjs'), 'utf8');
  assert.match(gate, /legacy green run without per-suite/);
  assert.match(gate, /run\.conclusion === 'success'/);
  assert.match(gate, /never launches paid runs itself/);
});

test('the bootstrap job carries the child identity diagnostic, and it is not a new gate', () => {
  assert.match(ciYml, /Child process prints and asserts its own pnpm identity \(diagnostic\)/);
  assert.match(ciYml, /npm_config_user_agent/);
});
