// Regression tests for docs-lint check 8 (per-call root-ceiling
// discipline in orchestration examples). The v1.20.0 review (P3-4)
// proved the original fence-level substring test blind: one capped call
// legitimized every uncapped neighbor in the same fence, and one
// `root-uncapped` marker exempted every call rather than the one it
// annotated. These tests pin the per-call rewrite to the reviewer's
// acceptance list.
//
// Run with: node --test scripts/docs-lint.test.mjs
// (scripts/ is outside the vitest project roots, so node:test it is.)
import assert from 'node:assert/strict';
import test from 'node:test';

import { check8Violations, checkOrchestrateFence } from './docs-lint.mjs';

/** @param {string[]} lines @returns {string} */
const fence = (lines) => lines.join('\n');

test('capped call plus uncapped call in one fence: exactly one failure, on the uncapped call', () => {
  const code = fence([
    "import { orchestrate } from '@rulvar/core';",
    '',
    "const capped = orchestrate(engine, 'task a', { maxSpawns: 4 }, { budgetUsd: 5 });",
    "const uncapped = orchestrate(engine, 'task b', { maxSpawns: 4 });",
  ]);
  assert.deepEqual(checkOrchestrateFence(code), [3]);
});

test('capped call plus a second call with its own call-bound root-uncapped marker: pass', () => {
  const code = fence([
    "const capped = orchestrate(engine, 'task a', {}, { budgetUsd: 5 });",
    '// root-uncapped: deliberate, the example demonstrates exhaustion',
    "const open = orchestrate(engine, 'task b', {});",
  ]);
  assert.deepEqual(checkOrchestrateFence(code), []);
});

test('marker bound to the first call does not exempt a second unmarked call', () => {
  const code = fence([
    '// root-uncapped',
    "const first = orchestrate(engine, 'task a', {});",
    '',
    "const second = orchestrate(engine, 'task b', {});",
  ]);
  assert.deepEqual(checkOrchestrateFence(code), [3]);
});

test('marker inside the call span binds to that call only', () => {
  const code = fence([
    'const first = orchestrate(',
    '  engine,',
    "  'task a',",
    '  {}, // root-uncapped: shown without a ceiling on purpose',
    ');',
    "const second = orchestrate(engine, 'task b', {});",
  ]);
  assert.deepEqual(checkOrchestrateFence(code), [5]);
});

test('multiline fourth argument object literal containing budgetUsd: pass', () => {
  const code = fence([
    'const handle = await orchestrate(',
    '  engine,',
    "  'migrate the packages',",
    '  { maxSpawns: 8 },',
    '  {',
    '    budgetUsd: 25,',
    '  },',
    ');',
  ]);
  assert.deepEqual(checkOrchestrateFence(code), []);
});

test('ctx.orchestrate without any options is exempt', () => {
  const code = fence([
    'export async function workflow(ctx) {',
    "  const child = await ctx.orchestrate('subtask');",
    '  return child;',
    '}',
  ]);
  assert.deepEqual(checkOrchestrateFence(code), []);
});

test('fourth argument as an identifier declared earlier in the fence with budgetUsd: pass', () => {
  const code = fence([
    'const runOptions = {',
    '  budgetUsd: 10,',
    "  label: 'nightly',",
    '};',
    '',
    "const handle = orchestrate(engine, 'task', { maxSpawns: 4 }, runOptions);",
  ]);
  assert.deepEqual(checkOrchestrateFence(code), []);
});

test('fourth argument as an identifier with no budgetUsd in its declaration: fail', () => {
  const code = fence([
    "const runOptions = { label: 'nightly' };",
    "const handle = orchestrate(engine, 'task', { maxSpawns: 4 }, runOptions);",
  ]);
  assert.deepEqual(checkOrchestrateFence(code), [1]);
});

test('orchestratePlanned is covered the same as orchestrate', () => {
  const capped = fence([
    "const a = orchestratePlanned(engine, 'task', { plan: {} }, { budgetUsd: 10 });",
  ]);
  assert.deepEqual(checkOrchestrateFence(capped), []);

  const uncapped = fence([
    "const a = orchestratePlanned(engine, 'task', { plan: {} });",
    "const b = orchestratePlanned(engine, 'other', { plan: {} }, { budgetUsd: 10 });",
  ]);
  assert.deepEqual(checkOrchestrateFence(uncapped), [0]);
});

test('a fence with no helper calls produces no failures', () => {
  const code = fence([
    "import { createEngine } from '@rulvar/core';",
    'const engine = createEngine({ adapters: [] });',
  ]);
  assert.deepEqual(checkOrchestrateFence(code), []);
});

test('calls at nesting depth (await, arrow bodies) are found', () => {
  const code = fence([
    'const run = () => {',
    "  return Promise.all([orchestrate(engine, 'task', {})]);",
    '};',
  ]);
  assert.deepEqual(checkOrchestrateFence(code), [1]);
});

test('a larger identifier embedding the helper name is not a helper call', () => {
  const code = fence(["const x = reorchestrate(engine, 'task', {});"]);
  assert.deepEqual(checkOrchestrateFence(code), []);
});

test('comment-only fence naming a helper call falls back to the fence-level rule', () => {
  // ts.createSourceFile yields zero statements here, so the pre-rewrite
  // fence-level rule applies: no budgetUsd, no marker, one failure at
  // offset 0; the marker variant passes.
  const bare = '// later, call orchestrate(engine, task, opts) yourself';
  assert.deepEqual(checkOrchestrateFence(bare), [0]);
  const marked = '// root-uncapped: call orchestrate(engine, task, opts) yourself';
  assert.deepEqual(checkOrchestrateFence(marked), []);
});

test('check8Violations maps fence offsets to markdown line numbers and skips non ts/js fences', () => {
  const markdown = [
    '# Page', // line 1
    '', // line 2
    '```ts', // line 3, fence opener
    "const a = orchestrate(engine, 'task a', {}, { budgetUsd: 5 });", // line 4
    "const b = orchestrate(engine, 'task b', {});", // line 5, offending
    '```', // line 6
    '', // line 7
    '```bash', // line 8, wrong lang, ignored
    'run orchestrate(now)', // line 9
    '```', // line 10
  ].join('\n');
  const violations = check8Violations(markdown);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].line, 5);
  assert.match(violations[0].message, /EACH call/u);
});

test('check8Violations passes a fully compliant document', () => {
  const markdown = [
    '# Page',
    '```ts',
    "const a = orchestrate(engine, 'task', { maxSpawns: 4 }, { budgetUsd: 5 });",
    '```',
  ].join('\n');
  assert.deepEqual(check8Violations(markdown), []);
});
