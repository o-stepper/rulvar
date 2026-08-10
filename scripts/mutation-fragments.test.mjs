// Regression tests for the manifest fragment gate (RV2603). The full
// probe already refuses a fragment that stopped addressing its source,
// but it discovers it one entry at a time, mid-manifest, after minutes
// of test execution: RV2509 rewrote the claim-consistency meta assembly
// and orphaned `claim-coverage-envelope`, and the only surface that
// said so was the eighteen minute work-budget job, red long after every
// other check on the pull request had gone green. These tests pin the
// pure check, both refusal classes, and the two properties that make it
// worth running in the fast gates: it reads each file once, and it
// reports EVERY problem instead of stopping at the first.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs").
// scripts/ is outside the vitest project roots, so node:test it is.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { checkFragments } from './mutation-fragments.mjs';
import { MUTATIONS } from './mutation-probe.mjs';

const reader = (files) => (file) => {
  const source = files[file];
  if (source === undefined) {
    throw new Error(`unexpected read of ${file}`);
  }
  return source;
};

test('a fragment matching exactly once is not a problem', () => {
  const problems = checkFragments(
    [{ id: 'one', file: 'a.ts', find: 'const answer = 42;' }],
    reader({ 'a.ts': 'before\nconst answer = 42;\nafter\n' }),
  );
  assert.deepEqual(problems, []);
});

test('a fragment the source no longer carries is reported missing', () => {
  const problems = checkFragments(
    [{ id: 'moved', file: 'a.ts', find: 'const answer = 42;' }],
    reader({ 'a.ts': 'before\nconst answer = 43;\nafter\n' }),
  );
  assert.deepEqual(problems, [{ id: 'moved', file: 'a.ts', kind: 'missing', occurrences: 0 }]);
});

test('a fragment matching twice is ambiguous, not merely present', () => {
  // The full run refuses this too, and for the same reason: mutating
  // the first occurrence would silently test a line nobody chose.
  const problems = checkFragments(
    [{ id: 'doubled', file: 'a.ts', find: 'return true;' }],
    reader({ 'a.ts': 'function x() {\n  return true;\n}\nfunction y() {\n  return true;\n}\n' }),
  );
  assert.deepEqual(problems, [{ id: 'doubled', file: 'a.ts', kind: 'ambiguous', occurrences: 2 }]);
});

test('every problem is reported, not just the first', () => {
  const problems = checkFragments(
    [
      { id: 'gone', file: 'a.ts', find: 'alpha' },
      { id: 'fine', file: 'b.ts', find: 'beta' },
      { id: 'doubled', file: 'c.ts', find: 'gamma' },
    ],
    reader({ 'a.ts': 'nothing here\n', 'b.ts': 'beta\n', 'c.ts': 'gamma gamma\n' }),
  );
  assert.deepEqual(
    problems.map((problem) => [problem.id, problem.kind]),
    [
      ['gone', 'missing'],
      ['doubled', 'ambiguous'],
    ],
  );
});

test('each file is read once however many fragments aim at it', () => {
  // The gate exists to be cheap: 441 fragments over a few dozen files
  // must not be 441 file reads.
  const reads = [];
  checkFragments(
    [
      { id: 'a', file: 'same.ts', find: 'one' },
      { id: 'b', file: 'same.ts', find: 'two' },
      { id: 'c', file: 'same.ts', find: 'three' },
    ],
    (file) => {
      reads.push(file);
      return 'one\ntwo\nthree\n';
    },
  );
  assert.deepEqual(reads, ['same.ts']);
});

test('the shipped manifest addresses its own sources', () => {
  // The gate held against the real manifest, which is what CI runs. It
  // reads the repository, so it is the one test here that is not pure.
  const problems = checkFragments(MUTATIONS, (file) =>
    readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'),
  );
  assert.deepEqual(problems, []);
});
