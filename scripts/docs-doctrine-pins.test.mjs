// Regression tests for the doctrine-pin gate (RV3901). The fourth
// comparison experiment lost its correctness score to one sentence:
// the budgets guide still taught "immutable after start ... resume
// accepts no budget parameter" six weeks after RV2208 shipped the
// ResumeOptions.run override, and the run's answer echoed its own
// stale guide. These tests pin the ban list, the required pins, the
// changelog exclusion, and the shipped docs themselves.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs").
// scripts/ is outside the vitest project roots, so node:test it is.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { BANNED, REQUIRED, judgeDoctrine } from './docs-doctrine-pins.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'docs-doctrine-pins.mjs');

test('a banned phrase fails any page, case-insensitively', () => {
  const failures = judgeDoctrine(
    'The ceiling is Immutable After Start, so nothing raises it.\n',
    'docs/guide/anything.md',
  );
  assert.equal(failures.length, 1);
  assert.match(failures[0], /retired doctrine "immutable after start"/u);
  assert.match(failures[0], /RV2208/u);
});

test('every banned entry catches its own phrase and names a why', () => {
  for (const ban of BANNED) {
    const failures = judgeDoctrine(`prefix ${ban.phrase} suffix`, 'docs/guide/x.md');
    assert.equal(failures.length, 1, ban.phrase);
    assert.ok(ban.why.length > 0);
  }
});

test('a required pin binds only its own page', () => {
  // budgets.md without the override API is a failure; another page
  // without it is fine.
  const bare = 'The ceiling is immutable within a segment.\n';
  const onBudgets = judgeDoctrine(bare, 'docs/guide/budgets.md');
  assert.ok(onBudgets.some((f) => /ResumeOptions\\\.run/u.test(f)));
  assert.ok(onBudgets.some((f) => /run_budget_override/u.test(f)));
  assert.deepEqual(judgeDoctrine(bare, 'docs/guide/other.md'), []);
});

test('a page satisfying its pins and avoiding the bans is clean', () => {
  const page =
    'B0 is immutable within a segment; `ResumeOptions.run` is the one ' +
    'explicit door, journaled as a `run_budget_override` decision, and ' +
    "`budgetPolicy: 'immutable-lifetime'` welds it shut.\n";
  assert.deepEqual(judgeDoctrine(page, 'docs/guide/budgets.md'), []);
});

test('the pin list names only pages the gate scans', () => {
  for (const pin of REQUIRED) {
    assert.match(pin.file, /^(docs\/(guide|reference)\/|README\.md$)/u);
    assert.notEqual(pin.file, 'docs/reference/changelog.md');
  }
});

test('the shipped docs pass the shipped pins, changelog excluded', () => {
  // The changelog legitimately quotes the retired phrases (it is the
  // historical record of retiring them), so a passing run also proves
  // the exclusion works.
  const run = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /banned phrases absent/u);
});
