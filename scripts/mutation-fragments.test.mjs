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

import { checkFragments, checkShape, checkSourceShape } from './mutation-fragments.mjs';
import { MUTATIONS } from './mutation-probe.mjs';

const entry = (extra = {}) => ({
  id: 'one',
  doctrine: 'a rule worth defending',
  file: 'a.ts',
  find: 'const answer = 42;',
  replace: 'const answer = 43;',
  test: 'a.test.ts',
  ...extra,
});

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

// Shape (RV2606): whether an entry is runnable AT ALL, decided from the
// manifest alone. A conflict resolution once dropped one `test` field,
// every fragment resolved, and the full manifest ran to that entry and
// died on `mutation.test.endsWith` at minute eighteen.

test('a complete entry is not a problem', () => {
  assert.deepEqual(checkShape([entry()]), []);
});

test('a missing field is named, and named exactly', () => {
  assert.deepEqual(checkShape([entry({ test: undefined })]), [
    { id: 'one', kind: 'missing-fields', fields: ['test'] },
  ]);
  assert.deepEqual(checkShape([entry({ find: undefined, replace: undefined })]), [
    { id: 'one', kind: 'missing-fields', fields: ['find', 'replace'] },
  ]);
});

test('an entry with no usable id is still reported, by index', () => {
  // The reader needs a handle on it even when the entry cannot name
  // itself: silence here is how the eighteen minute failure happened.
  assert.deepEqual(checkShape([entry({ id: undefined })]), [
    { id: '#0', kind: 'missing-fields', fields: ['id'] },
  ]);
  assert.deepEqual(checkShape([null]), [{ id: '#0', kind: 'not-an-entry' }]);
});

test('a duplicate id is a problem, and points at the first', () => {
  // `--only <id>` selects by id, so a duplicate makes one of the two
  // unrunnable on its own and both indistinguishable in the log.
  assert.deepEqual(checkShape([entry(), entry({ file: 'b.ts' })]), [
    { id: 'one', kind: 'duplicate-id', firstAt: 0 },
  ]);
});

test('a replace identical to its find is inert, and inert reads as a hole', () => {
  // Such a mutation changes nothing, so it can only ever SURVIVE, and a
  // survivor is reported as a gap in the suite: the manifest would
  // accuse its own tests of not defending a rule nobody attacked.
  assert.deepEqual(checkShape([entry({ replace: 'const answer = 42;' })]), [
    { id: 'one', kind: 'inert' },
  ]);
});

test('every shape problem is reported, not just the first', () => {
  const problems = checkShape([entry({ test: undefined }), entry({ id: 'two' }), entry()]);
  assert.deepEqual(
    problems.map((problem) => [problem.id, problem.kind]),
    [
      ['one', 'missing-fields'],
      ['one', 'duplicate-id'],
    ],
  );
});

test('the shipped manifest is runnable', () => {
  assert.deepEqual(checkShape(MUTATIONS), []);
});

test('two entries fused into one are caught in the SOURCE (RV2705)', () => {
  // The exact wreck a rebase resolution leaves: the `},` and `{`
  // between two entries vanish, the second entry's fields overwrite the
  // first's, and JS keeps the last of each duplicated key without a
  // word. The value that reaches checkShape is a perfectly formed
  // entry; only the text remembers there were two.
  const fused = [
    'export const MUTATIONS = [',
    '  {',
    "    id: 'first',",
    "    file: 'a.ts',",
    "    id: 'second',",
    "    file: 'b.ts',",
    '  },',
    '];',
  ].join('\n');
  const problems = checkSourceShape(fused, 1);
  assert.deepEqual(
    problems.map((problem) => problem.key),
    ['id', 'file'],
  );
  assert.ok(problems.every((problem) => problem.kind === 'duplicate-key'));
  // The surviving id names it: that is the entry the manifest now
  // holds, and the other one is gone.
  assert.ok(problems.every((problem) => problem.id === 'second'));
});

test('a healthy manifest source reports nothing', () => {
  const clean = [
    'export const MUTATIONS = [',
    '  {',
    "    id: 'first',",
    '    doctrine:',
    "      'a long doctrine prettier wrapped onto its own line, indented six spaces',",
    "    file: 'a.ts',",
    '  },',
    '  {',
    "    id: 'second',",
    "    file: 'b.ts',",
    '  },',
    '];',
  ].join('\n');
  assert.deepEqual(checkSourceShape(clean, 2), []);
});

test('a scan that can no longer see the entries says so, loudly', () => {
  // The check leans on the committed formatting, which is a CI gate of
  // its own. If that shape ever drifts, a blind gate that passes is
  // worse than one that fails, so the count disagreement is the alarm.
  const reformatted = 'export const MUTATIONS = [{ id: "first" }, { id: "second" }];';
  const problems = checkSourceShape(reformatted, 2);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, 'block-count-mismatch');
  assert.equal(problems[0].found, 0);
  assert.equal(problems[0].expected, 2);
});

test('the shipped manifest source is intact', () => {
  const source = readFileSync(new URL('./mutation-probe.mjs', import.meta.url), 'utf8');
  assert.deepEqual(checkSourceShape(source, MUTATIONS.length), []);
});
