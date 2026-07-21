// Regression tests for docs-lint check 8 (per-call root-ceiling
// discipline in orchestration examples). The v1.20.0 review (P3-4)
// proved the original fence-level substring test blind: one capped call
// legitimized every uncapped neighbor in the same fence, and one
// `root-uncapped` marker exempted every call rather than the one it
// annotated. These tests pin the per-call rewrite to the reviewer's
// acceptance list.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs");
// the same glob runs in the CI docs-lint job, so these tests gate every
// PR (v1.34.0 review P3). scripts/ is outside the vitest project
// roots, so node:test it is.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  check8Violations,
  checkOrchestrateFence,
  hasArgsHashOverclaim,
  hasAuthRetryOverclaim,
  hasReplayOrderOverclaim,
  overclaimSentences,
} from './docs-lint.mjs';

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

// Check 9 sentinel: the argsHash secrecy overclaim (v1.24.0 review
// P2-2). The digest is an unsalted deterministic SHA-256, so no doc or
// TSDoc may claim the meta carries nothing sensitive or that the hash is
// safe to expose.
test('the argsHash overclaim sentinel flags the shipped phrasing and its equivalents', () => {
  assert.equal(
    hasArgsHashOverclaim('presence). Never the raw args: nothing sensitive lands in meta.'),
    true,
  );
  assert.equal(hasArgsHashOverclaim('The meta record holds nothing sensitive whatsoever.'), true);
  assert.equal(hasArgsHashOverclaim('The argsHash is safe to expose in public dashboards.'), true);
  assert.equal(hasArgsHashOverclaim('the digest is safe to expose'), true);
});

test('the argsHash overclaim sentinel passes the corrective wording and its negations', () => {
  assert.equal(
    hasArgsHashOverclaim(
      'The digest is sensitive-derived metadata: it reveals args equality and is recoverable.',
    ),
    false,
  );
  assert.equal(
    hasArgsHashOverclaim('The hash is NOT safe to expose; protect it like the journal.'),
    false,
  );
  assert.equal(
    hasArgsHashOverclaim('Never the raw args, but the digest confers no confidentiality.'),
    false,
  );
});

// Check 10 sentinel: the replay order overclaim (v1.32.0 review P3).
// Same hash rows replay in recorded call order since v1.32.0; a bare
// "file order" ordering claim describes the retired semantics unless
// its own sentence scopes it to legacy groups.
test('the replay order overclaim sentinel flags the shipped Evals guide phrasing', () => {
  assert.equal(
    hasReplayOrderOverclaim(
      'rows sharing one canonical request hash replay one per call, in file order, so a ' +
        'recorded retry or a repeated case replays exactly as it ran.',
    ),
    true,
  );
  // A qualifier in a NEIGHBORING sentence does not legitimize the claim.
  assert.equal(
    hasReplayOrderOverclaim(
      'Identical requests replay in file order. Rows carry occurrence numbers since v1.32.0.',
    ),
    true,
  );
});

test('the replay order overclaim sentinel passes scoped mentions', () => {
  assert.equal(
    hasReplayOrderOverclaim(
      'every stream() call consumes exactly one occurrence, in recorded call order (file order ' +
        'for groups recorded before v1.32.0, whose rows carry no occurrence numbers).',
    ),
    false,
  );
  assert.equal(
    hasReplayOrderOverclaim('Legacy cassettes keep file order; nothing is renumbered.'),
    false,
  );
  // A version number dot does not end a sentence, so the qualifier
  // after "v1.32.0," still counts as the same sentence.
  assert.equal(
    hasReplayOrderOverclaim(
      'replay one per call, in recorded call order (file order only for groups recorded ' +
        'before v1.32.0, whose rows carry no occurrence numbers), so a recorded retry replays ' +
        'exactly as it ran.',
    ),
    false,
  );
  assert.equal(hasReplayOrderOverclaim('A page not mentioning ordering at all.'), false);
});

// Check 11 sentinel: the authentication retry overclaim (v1.33.0
// review P3). Both first class adapters mark an authentication
// failure retryable: false and retryClassOf returns no retry class
// for it, so a sentence asserting that such a failure is retried
// states a retry that never happens.
test('the authentication retry overclaim sentinel flags the shipped Troubleshooting phrasing', () => {
  assert.equal(
    hasAuthRetryOverclaim(
      'An authentication failure from the provider is currently retried like a transport ' +
        'failure, so the engine walks the resolved RetryPolicy backoff before the spawn ' +
        'settles: the stall is backoff, not a hang.',
    ),
    true,
  );
  // The active form is an overclaim too.
  assert.equal(
    hasAuthRetryOverclaim('The engine retries an authentication failure with linear backoff.'),
    true,
  );
  // A negation in a NEIGHBORING sentence does not legitimize the claim.
  assert.equal(
    hasAuthRetryOverclaim(
      'A credential failure is retried. An authentication failure is never retried.',
    ),
    true,
  );
});

test('the authentication retry overclaim sentinel passes negated and unrelated phrasings', () => {
  assert.equal(
    hasAuthRetryOverclaim(
      'An authentication failure is never retried: the adapters mark it retryable: false, so ' +
        'the spawn settles right after the single failed request.',
    ),
    false,
  );
  assert.equal(hasAuthRetryOverclaim('The engine never retries an authentication failure.'), false);
  assert.equal(
    hasAuthRetryOverclaim(
      'a typed retryable error (429 rate limit, 529 overload) gets a bounded retry with ' +
        'linear backoff, and a non-retryable error (authentication, invalid model) fails ' +
        'immediately with the typed WireError intact.',
    ),
    false,
  );
  assert.equal(hasAuthRetryOverclaim('A page not mentioning credentials at all.'), false);
});

// The sentinels judge whole sentences across hard wrapped markdown
// lines: the shipped Troubleshooting overclaim carried
// "authentication" and "is currently retried" on DIFFERENT lines of
// one sentence, which a per line window cannot conjoin.
test('overclaimSentences reassembles a sentence wrapped across lines and reports its start line', () => {
  const wrapped = [
    'Some earlier sentence. An authentication failure from',
    'the provider is currently retried like a transport failure, so the',
    'engine walks the backoff.',
  ].join('\n');
  const hits = overclaimSentences(wrapped);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 1);
  assert.match(hits[0].message, /authentication retry overclaim/);
});

test('overclaimSentences accepts a qualifier on the next line of the same sentence', () => {
  // Per line, "in file order" would flag: its qualifier sits on the
  // following line. As one sentence it is scoped and passes.
  const scoped = [
    'Rows replay in recorded call order (file order only for groups',
    'recorded before v1.32.0, whose rows carry no occurrence numbers).',
  ].join('\n');
  assert.deepEqual(overclaimSentences(scoped), []);
  assert.deepEqual(overclaimSentences('Nothing about ordering or credentials here.'), []);
});
