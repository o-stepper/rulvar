// Regression tests for the invocation-role doc gate (RV2511). The
// 1.226.0 comparison review found the docs disagreeing with themselves
// about a closed union: `InvocationRole` has seven members, the
// model-routing and agents guides said seven, and the architecture
// guide and the design principles said six and listed six, dropping
// `synthesize`. The same prose ships inside llms-full.txt. These tests
// pin the parse, the two marker kinds, the frontmatter arm, and the
// refusal of an unmarked count nothing can keep true.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs").
// scripts/ is outside the vitest project roots, so node:test it is.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { applyRoleTruth, parseInvocationRoles } from './docs-role-truth.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'docs-role-truth.mjs');
const ROLES = ['orchestrate', 'plan', 'loop', 'finalize', 'extract', 'summarize', 'synthesize'];

test('parseInvocationRoles reads the union in declaration order', () => {
  const source = [
    '/** Docs above the type. */',
    'export type InvocationRole =',
    "  'orchestrate' | 'plan' | 'loop' | 'finalize' | 'extract' | 'summarize' | 'synthesize';",
    '',
    "export type Unrelated = 'nope';",
  ].join('\n');
  assert.deepEqual(parseInvocationRoles(source), ROLES);
});

test('parseInvocationRoles refuses a shape it does not understand, fail closed', () => {
  assert.throws(() => parseInvocationRoles('export type Something = string;'), /not found/u);
  assert.throws(() => parseInvocationRoles('export type InvocationRole = string;'), /empty union/u);
});

test('a marked count and list are judged against the union', () => {
  const page = 'One of <!-- roles:count -->six<!-- /roles --> roles.\n';
  const judged = applyRoleTruth(page, { roles: ROLES, where: 'page.md' });
  assert.equal(judged.failures.length, 1);
  assert.match(judged.failures[0], /roles:count reads "six"/u);
  // Untouched without --write: a check never rewrites.
  assert.equal(judged.updated, page);
  const written = applyRoleTruth(page, { roles: ROLES, write: true, where: 'page.md' });
  assert.equal(written.failures.length, 0);
  assert.equal(written.updated, 'One of <!-- roles:count -->seven<!-- /roles --> roles.\n');
});

test('the generated list is the union, backticked, in declaration order', () => {
  const page = 'Roles: <!-- roles:list -->`loop`<!-- /roles -->.\n';
  const written = applyRoleTruth(page, { roles: ROLES, write: true });
  assert.equal(
    written.updated,
    'Roles: <!-- roles:list -->`orchestrate`, `plan`, `loop`, `finalize`, `extract`, ' +
      '`summarize`, `synthesize`<!-- /roles -->.\n',
  );
});

test('an unmarked count is a failure even when it is currently right', () => {
  // The whole point: a correct number nothing owns goes stale the next
  // time the union grows, which is exactly how the six-role prose
  // survived the synthesis role shipping.
  const judged = applyRoleTruth('Keyed by any of the seven invocation roles.\n', { roles: ROLES });
  assert.equal(judged.failures.length, 1);
  assert.match(judged.failures[0], /counts the roles in prose no marker owns/u);
  // The markdown-link form counts too.
  const linked = applyRoleTruth('any of the seven [invocation roles](#x).\n', { roles: ROLES });
  assert.equal(linked.failures.length, 1);
});

test('a marked count is not also reported as unmarked prose', () => {
  const page = 'Any of the <!-- roles:count -->seven<!-- /roles --> invocation roles.\n';
  assert.deepEqual(applyRoleTruth(page, { roles: ROLES }).failures, []);
});

test('a frontmatter count is checked and rewritten in place, markers being invalid YAML', () => {
  const page = [
    '---',
    'title: T',
    'description: routes six invocation roles.',
    '---',
    '',
    'Body.\n',
  ].join('\n');
  const judged = applyRoleTruth(page, { roles: ROLES, where: 'page.md' });
  assert.equal(judged.failures.length, 1);
  assert.match(judged.failures[0], /frontmatter says "six invocation roles"/u);
  const written = applyRoleTruth(page, { roles: ROLES, write: true });
  assert.equal(written.failures.length, 0);
  assert.match(written.updated, /description: routes seven invocation roles\./u);
  // No HTML comment was injected into the YAML block.
  assert.equal(written.updated.includes('<!--'), false);
});

test('the shipped docs match the shipped union', () => {
  const run = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /the docs match the exported InvocationRole/u);
});
