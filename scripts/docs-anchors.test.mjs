// Regression tests for the internal-anchor gate (RV2704). Pure
// functions over strings: no site build, no filesystem walk, no
// network.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  anchorLinksOf,
  anchorProblems,
  anchorsOf,
  candidatePages,
  headingText,
  vitepressSlug,
} from './docs-anchors.mjs';

test('the slug rule is VitePress, not an approximation', () => {
  assert.equal(vitepressSlug('The finalization window'), 'the-finalization-window');
  // The four shapes a hand-rolled slugger gets wrong, all of them real
  // links on this site today. Punctuation becomes a SEPARATOR; it is
  // not dropped, which is why an approximation reports these as broken.
  assert.equal(vitepressSlug("children's"), 'children-s');
  assert.equal(vitepressSlug('@rulvar/store-postgres'), 'rulvar-store-postgres');
  assert.equal(vitepressSlug('toWire()'), 'towire');
  assert.equal(
    vitepressSlug('At-least-once dispatch, exactly-once pay'),
    'at-least-once-dispatch-exactly-once-pay',
  );
});

test('a slug never starts with a digit and never ends with a separator', () => {
  // markdown-it-anchor's own rule: a leading digit is prefixed, so the
  // id stays a valid CSS selector.
  assert.equal(vitepressSlug('3 ways to fail'), '_3-ways-to-fail');
  assert.equal(vitepressSlug('Cost, usage, and money.'), 'cost-usage-and-money');
});

test('heading text is the rendered text, never the markup', () => {
  assert.equal(headingText('The `completion` lift'), 'The completion lift');
  assert.equal(headingText('**Bold** and _thin_'), 'Bold and thin');
  // An INTRAWORD underscore is literal in markdown-it, so it survives
  // into the text and slugs as a separator: run-settle, not runsettle.
  assert.equal(headingText('The `run_settle` decision'), 'The run_settle decision');
  assert.equal(vitepressSlug(headingText('The `run_settle` decision')), 'the-run-settle-decision');
  assert.equal(headingText('See [the guide](/guide/agents)'), 'See the guide');
  assert.equal(headingText('Type: `Record\\<string, number\\>`'), 'Type: Record<string, number>');
  assert.equal(
    headingText('The deployment boundary {#the-deployment-boundary}'),
    'The deployment boundary',
  );
});

test('an explicit id replaces the slug rather than joining it', () => {
  const anchors = anchorsOf('## The three moneys of one run {#the-three-moneys}\n');
  assert.ok(anchors.has('the-three-moneys'));
  assert.equal(anchors.has('the-three-moneys-of-one-run'), false);
});

test('repeated headings take markdown-it-anchor suffixes', () => {
  // The generated API tree carries four `#returns` on one page, and a
  // link to the third one is `#returns-2`.
  const anchors = anchorsOf('#### Returns\n\n#### Returns\n\n#### Returns\n');
  assert.deepEqual([...anchors], ['returns', 'returns-1', 'returns-2']);
});

test('raw HTML ids count: TypeDoc anchors its property rows that way', () => {
  const anchors = anchorsOf('| <a id="property-code"></a> `code` | `abstract` |\n');
  assert.ok(anchors.has('property-code'));
});

test('a heading inside a fence is code, not a heading', () => {
  const anchors = anchorsOf('```md\n## Not a heading\n```\n\n## A heading\n');
  assert.deepEqual([...anchors], ['a-heading']);
});

test('links are collected with their line, and external schemes are skipped', () => {
  const links = anchorLinksOf(
    ['See [a](/guide/agents#roles).', '', '[b](https://example.com/x#frag) and [c](#local).'].join(
      '\n',
    ),
  );
  assert.deepEqual(links, [
    { line: 1, target: '/guide/agents', anchor: 'roles' },
    { line: 3, target: '', anchor: 'local' },
  ]);
});

test('a link inside a fence makes no claim', () => {
  assert.deepEqual(anchorLinksOf('```ts\n// [a](/guide/x#nope)\n```\n'), []);
});

test('a target resolves like VitePress: file, extensionless page, directory index', () => {
  assert.deepEqual(candidatePages('guide/a.md', '/guide/budgets'), [
    'guide/budgets.md',
    'guide/budgets/index.md',
  ]);
  assert.deepEqual(candidatePages('guide/a.md', '/api/@rulvar/core/x.md'), [
    'api/@rulvar/core/x.md',
  ]);
  assert.deepEqual(candidatePages('guide/a.md', './b'), ['guide/b.md', 'guide/b/index.md']);
  assert.deepEqual(candidatePages('guide/a.md', '../reference/c'), [
    'reference/c.md',
    'reference/c/index.md',
  ]);
  // An empty target is the page itself.
  assert.deepEqual(candidatePages('guide/a.md', ''), ['guide/a.md']);
});

test('a renamed heading is reported at its link, with the page that lost it', () => {
  const pages = new Map([
    ['guide/a.md', '# A\n\nSee [the contract](/guide/b#the-finish-validation-contract).\n'],
    ['guide/b.md', '# B\n\n### Validating the finish result\n'],
  ]);
  const problems = anchorProblems(pages, ['guide/a.md']);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].file, 'guide/a.md');
  assert.equal(problems[0].line, 3);
  assert.match(problems[0].message, /guide\/b\.md' publishes no anchor '#the-finish-validation/u);
});

test('a link to a page that does not exist is reported as such', () => {
  const pages = new Map([['guide/a.md', '# A\n\n[x](/guide/gone#anywhere)\n']]);
  const problems = anchorProblems(pages, ['guide/a.md']);
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /resolves to no page/u);
});

test('a generated page is a valid target and never a judged source', () => {
  const pages = new Map([
    ['guide/a.md', '# A\n\n[x](/api/core/RulvarError.md#property-code)\n'],
    ['api/core/RulvarError.md', '# RulvarError\n\n| <a id="property-code"></a> `code` |\n'],
    // A broken link in the generated tree: not this gate's business,
    // because nothing in this repository can fix it by hand.
    ['api/core/RulvarError.md#x', ''],
  ]);
  assert.deepEqual(anchorProblems(pages, ['guide/a.md']), []);
});

test('every anchor of the shipped documentation resolves', async () => {
  // The gate against the real tree: the same walk the script runs, so
  // a broken link fails here as well as in CI.
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const script = fileURLToPath(new URL('./docs-anchors.mjs', import.meta.url));
  const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
  assert.match(out, /internal anchors across/u);
});
