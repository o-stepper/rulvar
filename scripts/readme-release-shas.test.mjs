// Regression tests for the README release-table SHA gate (RV807). The
// twelfth experiment's validation found the v1.109.0 row citing a squash
// SHA that exists on NO branch of the repository (`git branch -a
// --contains 4ae268e` was empty): a hand-typed abbreviation drifted from
// the real merge and the release history pointed at an unreachable
// object for eleven releases. The gate makes reachability a CI fact:
// every SHA the table cites must be an ancestor of HEAD.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs");
// the same glob runs in the CI docs-lint job, so these tests gate every
// PR. scripts/ is outside the vitest project roots, so node:test it is.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseReleaseShas } from './readme-release-shas.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'readme-release-shas.mjs');

test('parseReleaseShas extracts the SHA of every release-table row, deduplicated', () => {
  const readme = [
    '# Project',
    '',
    '| Release       | Round                             | Next       |',
    '| ------------- | --------------------------------- | ---------- |',
    '| v1.17.0       | 943962d (#202): priced siblings   | v1.18.0    |',
    '| v1.18.0       | 8cc9a9c (#205): instructed finalize | v1.19.0  |',
    '| v1.19.0       | 943962d (#202): a repeated citation | v1.20.0  |',
    '',
    'Prose mentioning deadbeef (#999): never a table row.',
  ].join('\n');
  assert.deepEqual(parseReleaseShas(readme), ['943962d', '8cc9a9c']);
});

test('parseReleaseShas returns an empty list when no row matches', () => {
  assert.deepEqual(parseReleaseShas('# Nothing here\n\nJust prose.\n'), []);
});

/**
 * Builds a scratch repository: two commits on the default branch, one
 * commit on an unmerged side branch. Returns the directory and the
 * three SHAs.
 */
function scratchRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-readme-shas-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout.trim();
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Scratch');
  writeFileSync(join(dir, 'file.txt'), 'one\n', 'utf8');
  git('add', 'file.txt');
  git('commit', '-q', '-m', 'one');
  const first = git('rev-parse', 'HEAD');
  writeFileSync(join(dir, 'file.txt'), 'two\n', 'utf8');
  git('commit', '-q', '-am', 'two');
  const second = git('rev-parse', 'HEAD');
  git('checkout', '-q', '-b', 'side');
  writeFileSync(join(dir, 'file.txt'), 'side\n', 'utf8');
  git('commit', '-q', '-am', 'side');
  const side = git('rev-parse', 'HEAD');
  git('checkout', '-q', 'main');
  return { dir, git, first, second, side };
}

function tableWith(...shas) {
  const rows = shas.map(
    (sha, index) =>
      `| v1.${String(index + 1)}.0 | ${sha.slice(0, 7)} (#${String(index + 1)}): a summary | v1.${String(index + 2)}.0 |`,
  );
  return ['| Release | Round | Next |', '| --- | --- | --- |', ...rows, ''].join('\n');
}

function runGate(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' });
}

test('every cited SHA an ancestor of HEAD: exit 0', () => {
  const { dir, first, second } = scratchRepo();
  writeFileSync(join(dir, 'README.md'), tableWith(first, second), 'utf8');
  const result = runGate(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2 release-table SHA/);
});

test('a SHA that names no object fails the gate by name', () => {
  const { dir, first } = scratchRepo();
  writeFileSync(join(dir, 'README.md'), tableWith(first, 'deadbee1'), 'utf8');
  const result = runGate(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /deadbee/);
  assert.match(result.stderr, /no commit/);
});

test('a commit reachable only from an unmerged side branch fails as not an ancestor', () => {
  const { dir, first, side } = scratchRepo();
  writeFileSync(join(dir, 'README.md'), tableWith(first, side), 'utf8');
  const result = runGate(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(side.slice(0, 7)));
  assert.match(result.stderr, /not an ancestor/);
});

test('a README with no parseable release rows fails instead of green-washing', () => {
  const { dir } = scratchRepo();
  writeFileSync(join(dir, 'README.md'), '# Empty\n\nNo table.\n', 'utf8');
  const result = runGate(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no release-table rows/);
});

test('a shallow clone is refused: ancestry cannot be decided without history', () => {
  const { dir, first, second } = scratchRepo();
  writeFileSync(join(dir, 'README.md'), tableWith(first, second), 'utf8');
  spawnSync('git', ['-C', dir, 'add', 'README.md'], { encoding: 'utf8' });
  spawnSync('git', ['-C', dir, 'commit', '-q', '-m', 'readme'], { encoding: 'utf8' });
  const shallowDir = mkdtempSync(join(tmpdir(), 'rulvar-readme-shallow-'));
  const clone = spawnSync(
    'git',
    ['clone', '-q', '--depth', '1', `file://${dir}`, join(shallowDir, 'clone')],
    { encoding: 'utf8' },
  );
  assert.equal(clone.status, 0, clone.stderr);
  const result = runGate(join(shallowDir, 'clone'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /shallow/);
});
