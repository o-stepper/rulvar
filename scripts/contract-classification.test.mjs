// The classification vocabulary (RV4306): six outcomes, per suite per
// provider, and an aggregate that never launders a partial run into
// 'passed'. These fixtures ARE the acceptance for the workflow side:
// the writer and the reader share exactly these functions.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  aggregateOutcome,
  initClassification,
  recordOutcome,
  renderClassification,
  requireClassification,
  SUITE_MATRIX,
} from './contract-classification.mjs';

const SHA = 'a'.repeat(40);

const fill = (doc, outcome) =>
  SUITE_MATRIX.reduce((acc, cell) => recordOutcome(acc, { ...cell, outcome }), doc);

test('a disabled program classifies every cell skipped-disabled and aggregates partial', () => {
  const doc = initClassification({ sha: SHA, enabled: false });
  assert.equal(doc.suites.length, SUITE_MATRIX.length);
  assert.ok(doc.suites.every((row) => row.outcome === 'skipped-disabled'));
  const aggregate = aggregateOutcome(doc);
  assert.equal(aggregate.verdict, 'partial');
  assert.ok(aggregate.detail.every((line) => line.includes('skipped-disabled')));
});

test('all cells passed aggregates passed; one failed cell fails the whole', () => {
  const green = fill(initClassification({ sha: SHA, enabled: true }), 'passed');
  assert.deepEqual(aggregateOutcome(green), { verdict: 'passed', detail: [] });
  const drifted = recordOutcome(green, {
    suite: 'vcr-contract',
    provider: 'openai',
    outcome: 'failed',
    detail: 'finish reason drifted',
  });
  const aggregate = aggregateOutcome(drifted);
  assert.equal(aggregate.verdict, 'failed');
  assert.deepEqual(aggregate.detail, ['vcr-contract/openai: failed']);
});

test('ONE key of two is a named partial, never a green run', () => {
  // The exact hole this train closes: the scheduled run with only the
  // Anthropic key skipped every OpenAI row and finished green.
  let doc = initClassification({ sha: SHA, enabled: true });
  doc = recordOutcome(doc, {
    suite: 'vcr-contract',
    provider: 'anthropic',
    outcome: 'passed',
    checks: 4,
    failures: 0,
  });
  doc = recordOutcome(doc, {
    suite: 'vcr-contract',
    provider: 'openai',
    outcome: 'skipped-missing-secret',
    detail: 'OPENAI_API_KEY absent from repository secrets',
  });
  doc = recordOutcome(doc, { suite: 'caps-audit', provider: 'anthropic', outcome: 'passed' });
  doc = recordOutcome(doc, { suite: 'rates-audit', provider: 'docs-pages', outcome: 'passed' });
  const aggregate = aggregateOutcome(doc);
  assert.equal(aggregate.verdict, 'partial');
  assert.deepEqual(aggregate.detail, ['vcr-contract/openai: skipped-missing-secret']);
});

test('missing fixtures and cancellation classify by name; unreported cells stay partial', () => {
  let doc = initClassification({ sha: SHA, enabled: true });
  doc = recordOutcome(doc, {
    suite: 'vcr-contract',
    provider: 'anthropic',
    outcome: 'skipped-no-fixtures',
    detail: 'no provider VCR cassettes committed yet',
  });
  assert.equal(aggregateOutcome(doc).verdict, 'partial');
  assert.ok(aggregateOutcome(doc).detail.some((line) => line.includes('unreported')));
  const cancelled = recordOutcome(doc, {
    suite: 'caps-audit',
    provider: 'anthropic',
    outcome: 'cancelled',
  });
  assert.equal(aggregateOutcome(cancelled).verdict, 'failed');
});

test('the vocabulary is closed: unknown outcomes and unknown pairs refuse', () => {
  const doc = initClassification({ sha: SHA, enabled: true });
  assert.throws(
    () => recordOutcome(doc, { suite: 'vcr-contract', provider: 'anthropic', outcome: 'green' }),
    /unknown outcome 'green'/,
  );
  assert.throws(
    () => recordOutcome(doc, { suite: 'vcr-contract', provider: 'mistral', outcome: 'passed' }),
    /unknown suite\/provider pair/,
  );
});

test('the reader contract validates schema, workflow identity, sha shape, and outcomes', () => {
  const doc = fill(initClassification({ sha: SHA, enabled: true }), 'passed');
  assert.equal(requireClassification(doc), doc);
  assert.throws(() => requireClassification({ ...doc, schema: 2 }), /schema 2 is not 1/);
  assert.throws(() => requireClassification({ ...doc, workflow: 'ci' }), /is not contract-tests/);
  assert.throws(() => requireClassification({ ...doc, sha: 'short' }), /40-hex commit/);
  assert.throws(
    () => requireClassification({ ...doc, suites: [{ outcome: 'green' }] }),
    /unknown outcome/,
  );
});

test('the renderer carries one labeled line per cell plus the aggregate', () => {
  let doc = initClassification({ sha: SHA, enabled: true });
  doc = recordOutcome(doc, {
    suite: 'vcr-contract',
    provider: 'anthropic',
    outcome: 'passed',
    checks: 4,
    failures: 0,
  });
  doc = recordOutcome(doc, {
    suite: 'vcr-contract',
    provider: 'openai',
    outcome: 'skipped-missing-secret',
    detail: 'OPENAI_API_KEY absent',
  });
  const rendered = renderClassification(doc);
  assert.match(rendered, /^Live contract classification \(sha a{40}\): partial$/m);
  assert.match(rendered, /- vcr-contract\/anthropic: passed \(4 checks, 0 failures\)/);
  assert.match(rendered, /- vcr-contract\/openai: skipped-missing-secret: OPENAI_API_KEY absent/);
  assert.match(rendered, /- aggregate: /);
});
