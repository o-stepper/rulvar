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
  exactlyOnceHits,
  inProcessExecutorHits,
  fenceImportBindings,
  hasArgsHashOverclaim,
  hasAuthRetryOverclaim,
  hasReplayOrderOverclaim,
  loadPackageUniverse,
  overclaimSentences,
  packageImportViolations,
  packageParityViolations,
  packageTruthViolations,
  unknownPackageTokens,
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

// The exactly-once claim sentinel (RV508, the ninth-experiment review):
// SECURITY.md declares tool execution at-least-once (a crash between a
// tool's execution and the turn-boundary checkpoint re-runs it), and
// the isolated-executor guide shipped "each ran once" while the tools
// guide shipped "executes exactly once" beside it: two contracts for
// one runtime. The seeded fixtures below are the red-first proof the
// rule catches the exact shipped shapes; the allowlist is by file plus
// heading anchor, so an existing exemption cannot silently legitimize a
// new claim in another section.
test('a doc claiming exactly-once is flagged with its line, in every casing and hyphenation', () => {
  const doc = ['# Tools', '', 'The approved tool executes exactly once, and nothing re-runs.'].join(
    '\n',
  );
  const hits = exactlyOnceHits(doc, 'guide/tools.md');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
  assert.match(hits[0].message, /exactly-once claim/);
  assert.equal(exactlyOnceHits('Promises exactly-once delivery.', 'guide/x.md').length, 1);
  assert.equal(exactlyOnceHits('EXACTLY ONCE, shouted.', 'guide/x.md').length, 1);
  assert.equal(exactlyOnceHits('Runs once and replays afterward.', 'guide/x.md').length, 0);
});

test('the durability pay doctrine and the guarantee matrix anchors stay legal; other sections do not', () => {
  const durability = [
    '## At-least-once dispatch, exactly-once pay',
    '',
    'A completed pair replays exactly once.',
    '',
    '## Moving a run between machines',
    '',
    'Also exactly once here.',
  ].join('\n');
  const hits = exactlyOnceHits(durability, 'guide/durability.md');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 7);

  const executor = [
    '### The guarantee matrix',
    '',
    'Exactly-once effect execution is promised by NO library layer.',
    '',
    '### Something else',
    '',
    'An exactly-once claim outside the matrix.',
  ].join('\n');
  const executorHits = exactlyOnceHits(executor, 'guide/isolated-executor.md');
  assert.equal(executorHits.length, 1);
  assert.equal(executorHits[0].line, 7);

  // The same anchors in a DIFFERENT file stay forbidden: the allowlist
  // binds (file, anchor) pairs, not anchors globally.
  const elsewhere = ['### The guarantee matrix', '', 'exactly once'].join('\n');
  assert.equal(exactlyOnceHits(elsewhere, 'guide/tools.md').length, 1);
});

test('source scanning judges comment lines only, never string literals or code', () => {
  const src = [
    "const CLAIM = 'executes exactly once';",
    '// the ledger folds usage exactly once',
    ' * applies exactly once per resume.',
    'run(); // a trailing comment is code territory, exactly once here is unseen',
  ].join('\n');
  const hits = exactlyOnceHits(src, 'packages/core/src/x.ts');
  assert.deepEqual(
    hits.map((hit) => hit.line),
    [2, 3],
  );
  assert.match(hits[0].message, /exactly-once claim/);
});

// RV612: markdown renders a newline as whitespace, so the sentinel must
// judge NORMALIZED contiguous prose and comment blocks, not single
// source lines, and the prior shipped recurrence "each ran once" is the
// same claim. The audit's two verbatim reproductions lead the block.
// RV3606: link targets are addresses, not published claims. The
// durability registry's own anchor slug carries the vetted phrase, so
// linking the precise fragment from an unvetted page used to trip the
// tombstone and pages linked the bare page instead.
test('a link target quoting the vetted anchor slug is not a claim (RV3606)', () => {
  const doc =
    'The lane rides [RV3405](/guide/durability#at-least-once-dispatch-exactly-once-pay), ' +
    'paid wires the settled terminal does not cover.';
  assert.equal(exactlyOnceHits(doc, 'guide/cli.md').length, 0);
});

test('link TEXT carrying the claim still trips; only the target is an address (RV3606)', () => {
  const doc = 'See [the tool executes exactly once](/guide/tools) for details.';
  const hits = exactlyOnceHits(doc, 'guide/x.md');
  assert.equal(hits.length, 1);
});

test('a source comment quoting the docs URL quotes an address too (RV3606)', () => {
  const src =
    '// the never-pay-twice invariant:\n' +
    '// https://docs.rulvar.com/guide/durability#at-least-once-dispatch-exactly-once-pay\n' +
    'export const x = 1;\n';
  assert.equal(exactlyOnceHits(src, 'packages/core/src/x.ts').length, 0);
});

test('a link wrapped across a markdown line break stays an address in the block pass (RV3606)', () => {
  const doc =
    'The pay doctrine lives at [the registry\n' +
    'section](/guide/durability#at-least-once-dispatch-exactly-once-pay) of the guide.';
  assert.equal(exactlyOnceHits(doc, 'guide/x.md').length, 0);
});

test('an autolink URL is an address (RV3606)', () => {
  const doc =
    'Read <https://docs.rulvar.com/guide/durability#at-least-once-dispatch-exactly-once-pay>.';
  assert.equal(exactlyOnceHits(doc, 'guide/x.md').length, 0);
});

test('a claim wrapped across a markdown line break is caught at the block start (RV612)', () => {
  const wrapped = exactlyOnceHits('The approved tool executes exactly\nonce.', 'guide/tools.md');
  assert.equal(wrapped.length, 1);
  assert.equal(wrapped[0].line, 1);
  assert.match(wrapped[0].message, /exactly-once claim/);
  const spaced = exactlyOnceHits('It executes exactly  once with double spacing.', 'guide/x.md');
  assert.equal(spaced.length, 1);
});

test('the shipped recurrence "each ran once" is the same forbidden claim (RV612)', () => {
  assert.equal(exactlyOnceHits('The approved calls each ran once.', 'guide/tools.md').length, 1);
  assert.equal(exactlyOnceHits('The approved calls each\nran once.', 'guide/tools.md').length, 1);
  // Inside a vetted anchor the recurrence is as legal as the claim.
  const vetted = [
    '### The guarantee matrix',
    '',
    'Historically the docs said the approved calls each ran once.',
  ].join('\n');
  assert.equal(exactlyOnceHits(vetted, 'guide/isolated-executor.md').length, 0);
});

test('a comment block wrapped across lines is caught in sources (RV612)', () => {
  const src = [
    'run();',
    '// the approved tool executes exactly',
    '// once per turn, whatever the crash timing',
    'more();',
  ].join('\n');
  const hits = exactlyOnceHits(src, 'packages/core/src/x.ts');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 2);
  const starred = [' * applies exactly', ' * once on resume.'].join('\n');
  assert.equal(exactlyOnceHits(starred, 'packages/core/src/y.ts').length, 1);
});

test('a wrapped claim inside a vetted anchor stays legal; the next section does not (RV612)', () => {
  const doc = [
    '## At-least-once dispatch, exactly-once pay',
    '',
    'A completed pair replays exactly',
    'once, and that is the pay doctrine.',
    '',
    '## Elsewhere',
    '',
    'This wraps exactly',
    'once outside the vetted anchor.',
  ].join('\n');
  const hits = exactlyOnceHits(doc, 'guide/durability.md');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 8);
});

// Check 12 (RV1701): package truth. The synthetic universe below keeps
// the unit layer independent of the real manifests; the final block
// pins the REAL universe's plan/planner symbol boundary, which is the
// exact conflation class the eighteenth comparison benchmark shipped.
/** @returns {Map<string, {exportSubpaths: Set<string>, symbols: Set<string> | null}>} */
const syntheticUniverse = () =>
  new Map([
    [
      '@rulvar/plan',
      {
        exportSubpaths: new Set(['.', './package.json']),
        symbols: new Set(['planRunner', 'orchestratePlanned']),
      },
    ],
    [
      '@rulvar/planner',
      {
        exportSubpaths: new Set(['.', './package.json']),
        symbols: new Set(['plan', 'compileScript']),
      },
    ],
    [
      '@rulvar/core',
      {
        exportSubpaths: new Set(['.', './package.json']),
        symbols: null,
      },
    ],
  ]);

test('check 12: a typo package name is flagged with its line; a sentence-final period is not captured (RV1701)', () => {
  const known = new Set(['@rulvar/core', '@rulvar/compat']);
  const hits = unknownPackageTokens(
    ['Use `@rulvar/core` here.', 'Enable `@rulvar/compat`.', 'Install @rulvar/planners now.'].join(
      '\n',
    ),
    known,
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
  assert.equal(hits[0].token, '@rulvar/planners');
});

test('check 12: fence bindings cover static, renamed, type-only, export-from, require, and dynamic forms (RV1701)', () => {
  const code = [
    "import { planRunner, type PlanOptions } from '@rulvar/plan';",
    "import { plan as makePlan } from '@rulvar/planner';",
    "export { compileScript } from '@rulvar/planner';",
    "const cjs = require('@rulvar/core');",
    "const dyn = await import('@rulvar/core/journal');",
  ].join('\n');
  const bindings = fenceImportBindings(code);
  assert.deepEqual(
    bindings.map((b) => b.specifier),
    ['@rulvar/plan', '@rulvar/planner', '@rulvar/planner', '@rulvar/core', '@rulvar/core/journal'],
  );
  assert.deepEqual(bindings[0].names, ['planRunner', 'PlanOptions']);
  assert.deepEqual(bindings[1].names, ['plan']);
  assert.equal(bindings[4].offset, 4);
});

test('check 12: the plan/planner conflation is a lint failure, not a shipped falsehood (RV1701)', () => {
  const violations = packageImportViolations(
    "import { planRunner } from '@rulvar/planner';",
    syntheticUniverse(),
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0].message, /'planRunner' is not exported by @rulvar\/planner/u);
  assert.match(violations[0].message, /distinct/u);
  assert.equal(
    packageImportViolations("import { planRunner } from '@rulvar/plan';", syntheticUniverse())
      .length,
    0,
  );
});

test('check 12: unknown packages and missing subpaths are flagged; null symbols skip only the symbol layer (RV1701)', () => {
  const universe = syntheticUniverse();
  const unknown = packageImportViolations("import { x } from '@rulvar/nope';", universe);
  assert.equal(unknown.length, 1);
  assert.match(unknown[0].message, /unknown package '@rulvar\/nope'/u);
  const subpath = packageImportViolations("import x from '@rulvar/plan/secret';", universe);
  assert.equal(subpath.length, 1);
  assert.match(subpath[0].message, /subpath '\.\/secret' is not in @rulvar\/plan's exports map/u);
  assert.equal(
    packageImportViolations("import { anything } from '@rulvar/core';", universe).length,
    0,
    'a package without a rollup skips the symbol layer, not the whole check',
  );
  assert.equal(packageImportViolations("import fs from 'node:fs';", universe).length, 0);
});

test('check 12: a renamed import checks the pre-rename name (RV1701)', () => {
  const ok = packageImportViolations(
    "import { plan as makePlan } from '@rulvar/planner';",
    syntheticUniverse(),
  );
  assert.equal(ok.length, 0);
  const bad = packageImportViolations(
    "import { makePlan as plan } from '@rulvar/planner';",
    syntheticUniverse(),
  );
  assert.equal(bad.length, 1);
  assert.match(bad[0].message, /'makePlan' is not exported/u);
});

test('check 12: packageTruthViolations reports fence violations at document lines and skips non ts/js fences (RV1701)', () => {
  const doc = [
    '# Page',
    '',
    '```ts',
    "import { planRunner } from '@rulvar/planner';",
    '```',
    '',
    '```bash',
    'pnpm add @rulvar/planner',
    '```',
  ].join('\n');
  const violations = packageTruthViolations(doc, syntheticUniverse());
  assert.equal(violations.length, 1);
  assert.equal(violations[0].line, 4);
});

test('check 12: fixed-group parity flags a missing member, an extra member, and a stale count word (RV1701)', () => {
  const base = {
    packagesText: [
      '| [`@rulvar/core`](/api/@rulvar/core/) | L0 | engine | x | y |',
      '| [`@rulvar/plan`](/api/@rulvar/plan/) | L4 | ext | x | y |',
      '| [`@rulvar/compat`](/api/@rulvar/compat/) | L2 | frozen | x | y |',
      '| `rulvar` (unscoped) | pointer | alias | x | y |',
    ].join('\n'),
    installationText: [
      '| `@rulvar/core` | engine |',
      '| `@rulvar/plan` | ext |',
      '| `@rulvar/compat` | frozen |',
    ].join('\n'),
    fixedGroup: ['@rulvar/core', '@rulvar/plan'],
  };
  const clean = packageParityViolations({
    ...base,
    versioningText:
      'The fixed group (two packages) ... The group is:\n\n`@rulvar/core`, `@rulvar/plan`.',
  });
  assert.deepEqual(clean, []);
  const missing = packageParityViolations({
    ...base,
    versioningText: 'The fixed group (two packages) ... The group is:\n\n`@rulvar/core`.',
  });
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /@rulvar\/plan is missing from the group list/u);
  const extra = packageParityViolations({
    ...base,
    versioningText:
      'The fixed group (two packages) ... The group is:\n\n`@rulvar/core`, `@rulvar/plan`, `@rulvar/ghost`.',
  });
  assert.equal(extra.length, 1);
  assert.match(extra[0].message, /names @rulvar\/ghost/u);
  const staleWord = packageParityViolations({
    ...base,
    versioningText:
      'The fixed group (fifteen packages) ... The group is:\n\n`@rulvar/core`, `@rulvar/plan`.',
  });
  assert.equal(staleWord.length, 1);
  assert.match(staleWord[0].message, /'\(two packages\)'/u);
});

test('check 12: a package table missing a publishable row is flagged for both pages (RV1701)', () => {
  const violations = packageParityViolations({
    versioningText:
      'The fixed group (two packages) ... The group is:\n\n`@rulvar/core`, `@rulvar/plan`.',
    packagesText: '| [`@rulvar/core`](/api/@rulvar/core/) | L0 | engine | x | y |',
    installationText: '| `@rulvar/core` | engine |',
    fixedGroup: ['@rulvar/core', '@rulvar/plan'],
  });
  const files = violations.map((violation) => `${violation.file}:${violation.message}`);
  assert.ok(files.some((f) => f.startsWith('packages:') && f.includes('@rulvar/plan')));
  assert.ok(files.some((f) => f.startsWith('installation:') && f.includes('@rulvar/plan')));
  assert.ok(files.some((f) => f.startsWith('packages:') && f.includes('@rulvar/compat')));
  assert.ok(files.some((f) => f.includes('pointer')));
});

test('check 12: the REAL universe keeps plan and planner distinct (RV1701)', () => {
  const universe = loadPackageUniverse();
  assert.ok(universe.size >= 17, `expected the full workspace, saw ${universe.size}`);
  const plan = universe.get('@rulvar/plan');
  const planner = universe.get('@rulvar/planner');
  assert.ok(plan?.symbols?.has('planRunner'));
  assert.ok(plan?.symbols?.has('orchestratePlanned'));
  assert.ok(!plan?.symbols?.has('compileScript'));
  assert.ok(planner?.symbols?.has('plan'));
  assert.ok(planner?.symbols?.has('compileScript'));
  assert.ok(!planner?.symbols?.has('planRunner'));
  const umbrella = universe.get('@rulvar/rulvar');
  assert.ok(umbrella?.symbols?.has('createEngine'), 'export * from core must flatten');
  assert.ok(umbrella?.symbols?.has('anthropic'));
  const pointer = universe.get('rulvar');
  assert.ok(pointer?.symbols?.has('createEngine'), 'the pointer resolves the umbrella symbols');
});

test('the in-process-only executor claim is tombstoned everywhere (RV2905)', () => {
  // The claim was fixed once on the architecture page and returned on
  // two others, where the ninth comparison audit found it contradicting
  // EngineOptions.executors and the shipped @rulvar/executor references.
  assert.equal(
    inProcessExecutorHits(
      'The current release enforces only the in-process tool executor; more prose.',
      'guide/planner.md',
    ).length,
    1,
  );
  assert.equal(
    inProcessExecutorHits('Only the in process executor exists here.', 'guide/x.md').length,
    1,
  );
  // A claim wrapped across a paragraph is the same published claim.
  assert.equal(
    inProcessExecutorHits(
      'The release enforces only the\nin-process tool executor today.',
      'guide/x.md',
    ).length,
    1,
  );
  // The true statement names the seam and passes.
  assert.equal(
    inProcessExecutorHits(
      'The core alone refuses a non-inprocess executor tag as a typed ConfigError at spawn ' +
        'time until a matching ToolExecutorProvider is registered.',
      'guide/x.md',
    ).length,
    0,
  );
  // Source comments are judged; source strings are runtime text.
  assert.equal(
    inProcessExecutorHits(
      '// only the in-process tool executor\nconst x = 1;',
      'packages/core/src/x.ts',
    ).length,
    1,
  );
  assert.equal(
    inProcessExecutorHits(
      "const s = 'only the in-process tool executor';",
      'packages/core/src/x.ts',
    ).length,
    0,
  );
});
