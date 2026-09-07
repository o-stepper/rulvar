// Regression tests for the documented-rates drift audit (RV813). The
// audit's pure pieces are tested offline against miniature fixtures of
// the two real page shapes; the live fetch runs only in the weekly
// contract workflow. The doctrine under test: extraction that comes
// back empty is a FINDING (the page shape changed, a human verifies),
// and the audit never tolerates and never rewrites. The comparator the
// audit runs (`compareRates`) lives at its published home in
// `@rulvar/core` since RV909, imported from dist inside main() like the
// seeds so this module stays loadable by the dependency-free CI script
// tests; `packages/core/src/model/pricing.test.ts` owns its unit tests
// (both directions, RV902) and the fault-injection kit drives it as a
// permanent gate. The stamp age judgement (RV4918) is tested under a
// fixed clock: the calendar lives in the scheduled run, never here.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs").
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeHtmlText,
  extractAnthropicModelRates,
  extractOpenAiModelRates,
  judgeStampAge,
  MAX_STAMP_AGE_DAYS,
} from './rates-audit.mjs';

test('decodeHtmlText strips markup and script bodies and decodes entities', () => {
  const html = [
    '<html><head><style>td { color: red; }</style>',
    '<script>const hidden = "$999";</script></head>',
    '<body><table><tr><td>Input</td><td>$5</td><td>1M&nbsp;tokens</td></tr></table>',
    '<p>Prompts with &gt;272K input tokens&#46;</p></body></html>',
  ].join('');
  const text = decodeHtmlText(html);
  assert.doesNotMatch(text, /999/);
  assert.doesNotMatch(text, /color/);
  assert.match(text, /Input \$5 1M tokens/);
  assert.match(text, /Prompts with >272K input tokens\./);
});

const OPENAI_PAGE = decodeHtmlText(
  [
    '<h1>GPT-5.6 Sol</h1>',
    '<table><tr><th>Metric</th><th>Price</th><th>Unit</th></tr>',
    '<tr><td>Input</td><td>$5</td><td>1M tokens</td></tr>',
    '<tr><td>Cached input</td><td>$0.5</td><td>1M tokens</td></tr>',
    '<tr><td>Output</td><td>$30</td><td>1M tokens</td></tr></table>',
    '<p>Cache writes are billed at 1.25x the uncached input token rate.</p>',
    '<p>Prompts with &gt;272K input tokens are priced at 2x input and 1.5x output for the full request.</p>',
  ].join(''),
);

test('extractOpenAiModelRates reads the metric table, the write multiplier, and the tier sentence', () => {
  const extracted = extractOpenAiModelRates(OPENAI_PAGE);
  assert.equal(extracted.ok, true);
  assert.deepEqual(extracted.rates, {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 30,
    cacheReadUsdPerMTok: 0.5,
    cacheWriteUsdPerMTok: 6.25,
    tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
  });
});

test('extractOpenAiModelRates fails closed when the metric table is missing', () => {
  const extracted = extractOpenAiModelRates(decodeHtmlText('<p>A page without pricing.</p>'));
  assert.equal(extracted.ok, false);
  assert.match(extracted.reason, /input/i);
});

test('extractOpenAiModelRates leaves the write rate and tiers absent when their sentences are missing', () => {
  const extracted = extractOpenAiModelRates(
    decodeHtmlText(
      '<table><tr><td>Input</td><td>$5</td></tr><tr><td>Cached input</td><td>$0.5</td></tr>' +
        '<tr><td>Output</td><td>$30</td></tr></table>',
    ),
  );
  assert.equal(extracted.ok, true);
  assert.equal(extracted.rates.cacheWriteUsdPerMTok, undefined);
  assert.equal(extracted.rates.tiers, undefined);
});

const ANTHROPIC_PAGE = decodeHtmlText(
  [
    '<h2>Model pricing</h2><table>',
    '<tr><th>Model</th><th>Base Input Tokens</th><th>5m Cache Writes</th>',
    '<th>1h Cache Writes</th><th>Cache Hits &amp; Refreshes</th><th>Output Tokens</th></tr>',
    // The newer sibling is listed FIRST and carries the longer name
    // (RV4918): a prefix match of 'Claude Fable 5' lands on this row.
    '<tr><td>Claude Fable 5.1</td><td>$10 / MTok</td><td>$12.50 / MTok</td>',
    '<td>$20 / MTok</td><td>$0.25 / MTok</td><td>$50 / MTok</td></tr>',
    '<tr><td>Claude Fable 5</td><td>$10 / MTok</td><td>$12.50 / MTok</td>',
    '<td>$20 / MTok</td><td>$1 / MTok</td><td>$50 / MTok</td></tr>',
    // The two row shape the page carried while the Sonnet 5 rate had a
    // scheduled end; the first row rule it pins outlives the promotion.
    '<tr><td>Claude Sonnet 5 <a href="#note">through August 31, 2026</a></td><td>$2 / MTok</td>',
    '<td>$2.50 / MTok</td><td>$4 / MTok</td><td>$0.20 / MTok</td><td>$10 / MTok</td></tr>',
    '<tr><td>Claude Sonnet 5 starting September 1, 2026</td><td>$3 / MTok</td>',
    '<td>$3.75 / MTok</td><td>$6 / MTok</td><td>$0.30 / MTok</td><td>$15 / MTok</td></tr>',
    '</table>',
  ].join(''),
);

test('extractAnthropicModelRates maps the five columns of the named row', () => {
  const extracted = extractAnthropicModelRates(ANTHROPIC_PAGE, 'Claude Fable 5');
  assert.equal(extracted.ok, true);
  assert.deepEqual(extracted.rates, {
    inputUsdPerMTok: 10,
    outputUsdPerMTok: 50,
    cacheReadUsdPerMTok: 1,
    cacheWriteUsdPerMTok: 12.5,
    cacheWrite1hUsdPerMTok: 20,
  });
});

test('extractAnthropicModelRates stops at the next model row: the first Sonnet 5 row wins', () => {
  const extracted = extractAnthropicModelRates(ANTHROPIC_PAGE, 'Claude Sonnet 5');
  assert.equal(extracted.ok, true);
  assert.equal(extracted.rates.inputUsdPerMTok, 2);
  assert.equal(extracted.rates.outputUsdPerMTok, 10);
});

test('extractAnthropicModelRates fails closed when the row shows fewer than five amounts', () => {
  const page = decodeHtmlText('<td>Claude Fable 5</td><td>$10 / MTok</td><td>$50 / MTok</td>');
  const extracted = extractAnthropicModelRates(page, 'Claude Fable 5');
  assert.equal(extracted.ok, false);
  assert.match(extracted.reason, /5 amounts|five amounts/);
});

test('extractAnthropicModelRates fails closed when the model is not on the page', () => {
  const extracted = extractAnthropicModelRates(ANTHROPIC_PAGE, 'Claude Mist 9');
  assert.equal(extracted.ok, false);
  assert.match(extracted.reason, /not found/);
});

test('extractAnthropicModelRates matches a display name as a whole name: Fable 5 is not the Fable 5.1 row (RV4918)', () => {
  const older = extractAnthropicModelRates(ANTHROPIC_PAGE, 'Claude Fable 5');
  assert.equal(older.ok, true);
  assert.equal(older.rates.cacheReadUsdPerMTok, 1);
  const newer = extractAnthropicModelRates(ANTHROPIC_PAGE, 'Claude Fable 5.1');
  assert.equal(newer.ok, true);
  assert.equal(newer.rates.cacheReadUsdPerMTok, 0.25);
  // A name the page shows only as a prefix of another is not found.
  const prefixOnly = extractAnthropicModelRates(
    decodeHtmlText('<td>Claude Fable 5.1</td><td>$10 / MTok</td>'),
    'Claude Fable 5',
  );
  assert.equal(prefixOnly.ok, false);
  assert.match(prefixOnly.reason, /not found/);
});

// A fixed clock (RV4918): the calendar is judged by the scheduled
// audit, and these tests never read Date.now().
const NOW = Date.parse('2026-09-07T12:00:00Z');

test('judgeStampAge passes a stamp within the bound and fails one past it (RV4918)', () => {
  assert.equal(MAX_STAMP_AGE_DAYS, 60);
  assert.equal(judgeStampAge({ ratesVerifiedAt: '2026-09-07' }, NOW), undefined);
  // Exactly sixty days is within the bound; the sixty first day is past it.
  assert.equal(judgeStampAge({ ratesVerifiedAt: '2026-07-09' }, NOW), undefined);
  const stale = judgeStampAge({ ratesVerifiedAt: '2026-07-08' }, NOW);
  assert.match(stale, /2026-07-08 is 61 days old/);
  assert.match(stale, /60 day re verification bound/);
  assert.match(stale, /keeps pricingVersion/);
  // The bound is a parameter: the same stamp is fresh under a wider one.
  assert.equal(judgeStampAge({ ratesVerifiedAt: '2026-07-08' }, NOW, 90), undefined);
});

test('judgeStampAge fails closed on a missing, unparsable, or future stamp (RV4918)', () => {
  assert.match(judgeStampAge({}, NOW), /no ratesVerifiedAt/);
  assert.match(judgeStampAge(undefined, NOW), /no ratesVerifiedAt/);
  assert.match(judgeStampAge({ ratesVerifiedAt: 'soon' }, NOW), /not a date/);
  // A date only stamp of today authored ahead of UTC reads hours in
  // the future and is fresh; a typo'd year reads months out.
  assert.equal(judgeStampAge({ ratesVerifiedAt: '2026-09-08' }, NOW), undefined);
  assert.match(judgeStampAge({ ratesVerifiedAt: '2027-09-07' }, NOW), /in the future/);
});
