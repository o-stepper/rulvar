// Regression tests for the documented-rates drift audit (RV813). The
// audit's pure pieces are tested offline against miniature fixtures of
// the two real page shapes; the live fetch runs only in the weekly
// contract workflow. The doctrine under test: extraction that comes
// back empty is a FINDING (the page shape changed, a human verifies),
// and a divergence between the page and the seed is named field by
// field; the audit never tolerates and never rewrites.
//
// Run with: pnpm test:scripts (node --test "scripts/**/*.test.mjs").
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareRates,
  decodeHtmlText,
  extractAnthropicModelRates,
  extractOpenAiModelRates,
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
    '<tr><td>Claude Fable 5</td><td>$10 / MTok</td><td>$12.50 / MTok</td>',
    '<td>$20 / MTok</td><td>$1 / MTok</td><td>$50 / MTok</td></tr>',
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

const SEED = {
  inputUsdPerMTok: 5,
  outputUsdPerMTok: 30,
  cacheReadUsdPerMTok: 0.5,
  cacheWriteUsdPerMTok: 6.25,
  tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
};

test('compareRates is silent when every seed field matches the page', () => {
  assert.deepEqual(compareRates(SEED, { ...SEED }), []);
});

test('compareRates names a diverging rate with both numbers', () => {
  const findings = compareRates(SEED, { ...SEED, inputUsdPerMTok: 6 });
  assert.equal(findings.length, 1);
  assert.match(findings[0], /inputUsdPerMTok/);
  assert.match(findings[0], /seed 5\b/);
  assert.match(findings[0], /page 6\b/);
});

test('compareRates flags a seed field the page no longer shows', () => {
  const { cacheWriteUsdPerMTok, ...pageWithoutWrite } = SEED;
  const findings = compareRates(SEED, pageWithoutWrite);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /cacheWriteUsdPerMTok/);
  assert.match(findings[0], /page shows no/);
});

test('compareRates flags tier drift field by field', () => {
  const findings = compareRates(SEED, {
    ...SEED,
    tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 2 }],
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0], /outputMultiplier/);
});

test('compareRates ignores page rates the seed never claimed', () => {
  const seed = {
    inputUsdPerMTok: 10,
    outputUsdPerMTok: 50,
    cacheReadUsdPerMTok: 1,
    cacheWriteUsdPerMTok: 12.5,
  };
  const page = { ...seed, cacheWrite1hUsdPerMTok: 20 };
  assert.deepEqual(compareRates(seed, page), []);
});
