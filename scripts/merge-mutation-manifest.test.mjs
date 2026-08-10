import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkSourceShape } from './mutation-fragments.mjs';
import { DRIVER, indexEntries, mergeManifests, splitManifest } from './merge-mutation-manifest.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const HEAD = ['// a synthetic manifest', 'export const MUTATIONS = ['].join('\n');
const TAIL = ['];', '', 'export const AFTER = 1;', ''].join('\n');

/**
 * One well-formed entry, in the committed shape.
 *
 * @param {string} id
 * @param {string} [doctrine]
 */
function entry(id, doctrine = `the ${id} doctrine`) {
  return [
    '  {',
    `    id: '${id}',`,
    `    doctrine: '${doctrine}',`,
    `    file: 'packages/core/src/${id}.ts',`,
    `    find: '${id} original',`,
    `    replace: '${id} mutated',`,
    `    test: 'packages/core/src/${id}.test.ts',`,
    '  },',
  ].join('\n');
}

/** The wreck a hand-resolved tail conflict leaves: two entries in one block. */
function fused(first, second) {
  const head = entry(first).split('\n').slice(0, -1);
  const rest = entry(second).split('\n').slice(1);
  return [...head, ...rest].join('\n');
}

/** @param {...string} entries */
function manifest(...entries) {
  return [HEAD, ...entries, TAIL].join('\n');
}

/** @param {string} text */
function idsOf(text) {
  const split = splitManifest(text);
  ok(split !== undefined, 'the merged text is a manifest');
  return [...indexEntries(split.entries).byId.keys()];
}

test('both sides append their own entry and both survive', () => {
  const merged = mergeManifests(
    manifest(entry('a')),
    manifest(entry('a'), entry('b')),
    manifest(entry('a'), entry('c')),
  );
  ok(merged.ok);
  strictEqual(merged.text, manifest(entry('a'), entry('b'), entry('c')));
  strictEqual(merged.entries, 3);
  deepStrictEqual(checkSourceShape(merged.text, 3), []);
});

test('the appended entries keep their bodies whole', () => {
  // The failure this driver exists for: the `},` and `{` between two
  // appended entries survive, so neither entry declares a key twice.
  const merged = mergeManifests(
    manifest(entry('a')),
    manifest(entry('a'), entry('b')),
    manifest(entry('a'), entry('c')),
  );
  ok(merged.ok);
  deepStrictEqual(idsOf(merged.text), ['a', 'b', 'c']);
  ok(merged.text.includes(entry('b')));
  ok(merged.text.includes(entry('c')));
});

test('the side that did not touch an entry never overwrites the side that did', () => {
  const base = manifest(entry('a'), entry('b'));
  const ours = mergeManifests(base, manifest(entry('a', 'ours'), entry('b')), base);
  ok(ours.ok);
  deepStrictEqual(idsOf(ours.text), ['a', 'b']);
  ok(ours.text.includes("doctrine: 'ours'"));

  const theirs = mergeManifests(base, base, manifest(entry('a', 'theirs'), entry('b')));
  ok(theirs.ok);
  ok(theirs.text.includes("doctrine: 'theirs'"));
});

test('both sides changing one entry is a real conflict', () => {
  const merged = mergeManifests(
    manifest(entry('a')),
    manifest(entry('a', 'ours')),
    manifest(entry('a', 'theirs')),
  );
  ok(!merged.ok);
  ok(merged.reason.includes("both sides changed 'a'"));
});

test('a deletion is honoured, and a deletion against an edit is a conflict', () => {
  const base = manifest(entry('a'), entry('b'));
  const dropped = mergeManifests(base, manifest(entry('a')), manifest(entry('a'), entry('b')));
  ok(dropped.ok);
  deepStrictEqual(idsOf(dropped.text), ['a']);

  const contested = mergeManifests(
    base,
    manifest(entry('a')),
    manifest(entry('a'), entry('b', 'theirs')),
  );
  ok(!contested.ok);
  ok(contested.reason.includes("they changed 'b' and we deleted it"));
});

test('an entry both sides added under one id, differently, is a conflict', () => {
  const merged = mergeManifests(
    manifest(entry('a')),
    manifest(entry('a'), entry('b', 'ours')),
    manifest(entry('a'), entry('b', 'theirs')),
  );
  ok(!merged.ok);
  ok(merged.reason.includes("both sides added 'b'"));
});

test('a side that already carries a fused entry is refused, not propagated', () => {
  // The self-check, which is the gate this driver would otherwise be
  // asking everyone else to trust it about: `ours` arrived from an
  // earlier botched resolution, so the merged text declares `id` twice
  // in one block even though every step above was correct.
  const merged = mergeManifests(
    manifest(entry('a'), entry('b')),
    manifest(fused('a', 'b')),
    manifest(entry('a'), entry('b'), entry('c')),
  );
  ok(!merged.ok);
  ok(merged.reason.includes('the merged manifest fails the source gate'));
  ok(merged.reason.includes('duplicate-key'));
});

test('both sides changing the code around the array falls back', () => {
  const withHead = (head, ...entries) => [head, ...entries, TAIL].join('\n');
  const merged = mergeManifests(
    manifest(entry('a')),
    withHead(`// ours\n${HEAD}`, entry('a')),
    withHead(`// theirs\n${HEAD}`, entry('a')),
  );
  ok(!merged.ok);
  ok(merged.reason.includes('both sides changed the code around the manifest'));
});

test('a file that is not this shape is handed back rather than guessed at', () => {
  const merged = mergeManifests(
    'const OTHER = [];\n',
    'const OTHER = [1];\n',
    'const OTHER = [2];\n',
  );
  ok(!merged.ok);
  ok(merged.reason.includes('not a manifest this driver can read'));
});

test('the real manifest splits into the entries the module exports', async () => {
  const source = readFileSync(join(ROOT, 'scripts/mutation-probe.mjs'), 'utf8');
  const split = splitManifest(source);
  ok(split !== undefined, 'the committed manifest is readable by this driver');
  // Byte for byte: what the driver writes is head, entries and tail
  // rejoined, so a split that dropped a character would rewrite the
  // manifest on every merge that touched it.
  strictEqual([split.head, ...split.entries, split.tail].join('\n'), source);
  const { MUTATIONS } = await import('./mutation-probe.mjs');
  strictEqual(split.entries.length, MUTATIONS.length);
  deepStrictEqual(
    [...indexEntries(split.entries).byId.keys()],
    MUTATIONS.map((mutation) => mutation.id),
  );
});

// The end-to-end half: a real git merge in a real repository, which is
// the only thing that proves the name in `.gitattributes`, the name in
// git config and the command that gets run all agree.

const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };

/**
 * @param {string} cwd
 * @param {string[]} args
 */
function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', env: GIT_ENV });
}

/**
 * A repository holding this driver, the committed `.gitattributes`, and
 * a manifest with one entry, with a branch that appended another.
 *
 * @param {string[]} ourEntries
 * @param {string[]} theirEntries
 */
function repoWithTwoAppends(ourEntries, theirEntries) {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-merge-'));
  mkdirSync(join(dir, 'scripts'));
  for (const file of ['scripts/merge-mutation-manifest.mjs', 'scripts/mutation-fragments.mjs']) {
    cpSync(join(ROOT, file), join(dir, file));
  }
  cpSync(join(ROOT, '.gitattributes'), join(dir, '.gitattributes'));
  writeFileSync(join(dir, 'scripts/mutation-probe.mjs'), manifest(entry('a')));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'probe@rulvar.test');
  git(dir, 'config', 'user.name', 'probe');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  git(dir, 'checkout', '-q', '-b', 'theirs');
  writeFileSync(join(dir, 'scripts/mutation-probe.mjs'), manifest(entry('a'), ...theirEntries));
  git(dir, 'commit', '-q', '-am', 'theirs');
  git(dir, 'checkout', '-q', 'main');
  writeFileSync(join(dir, 'scripts/mutation-probe.mjs'), manifest(entry('a'), ...ourEntries));
  git(dir, 'commit', '-q', '-am', 'ours');
  return dir;
}

test('with the driver installed, two appended entries merge with no conflict', (t) => {
  const dir = repoWithTwoAppends([entry('b')], [entry('c')]);
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const installed = spawnSync('node', ['scripts/merge-mutation-manifest.mjs', '--install'], {
    cwd: dir,
    encoding: 'utf8',
    env: GIT_ENV,
  });
  strictEqual(installed.status, 0);
  strictEqual(
    git(dir, 'config', '--local', '--get', `merge.${DRIVER}.driver`).stdout.trim(),
    'node scripts/merge-mutation-manifest.mjs %O %A %B %L %P',
  );

  const merged = git(dir, 'merge', '--no-edit', 'theirs');
  strictEqual(merged.status, 0, `the merge should not conflict: ${merged.stdout}${merged.stderr}`);
  const text = readFileSync(join(dir, 'scripts/mutation-probe.mjs'), 'utf8');
  deepStrictEqual(idsOf(text), ['a', 'b', 'c']);
  deepStrictEqual(checkSourceShape(text, 3), []);
});

test('without the driver, the same two appends conflict in the tail', (t) => {
  const dir = repoWithTwoAppends([entry('b')], [entry('c')]);
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const merged = git(dir, 'merge', '--no-edit', 'theirs');
  ok(merged.status !== 0, 'the ordinary text merge conflicts, which is what the driver removes');
  ok(readFileSync(join(dir, 'scripts/mutation-probe.mjs'), 'utf8').includes('<<<<<<<'));
});

test('with the driver installed, a rebase carries the appended entry across', (t) => {
  const dir = repoWithTwoAppends([entry('b')], [entry('c')]);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  spawnSync('node', ['scripts/merge-mutation-manifest.mjs', '--install'], {
    cwd: dir,
    encoding: 'utf8',
    env: GIT_ENV,
  });

  const rebased = git(dir, 'rebase', 'theirs');
  strictEqual(rebased.status, 0, `${rebased.stdout}${rebased.stderr}`);
  const text = readFileSync(join(dir, 'scripts/mutation-probe.mjs'), 'utf8');
  deepStrictEqual(idsOf(text), ['a', 'c', 'b']);
  deepStrictEqual(checkSourceShape(text, 3), []);
});
