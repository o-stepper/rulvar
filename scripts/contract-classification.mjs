// The machine-readable live-contract classification (RV4306, P1.6).
// The scheduled contract workflow used to end in exactly one bit (job
// green or red) over at least six distinct realities: a passed suite, a
// drifted provider, a disabled program, a missing secret for ONE of two
// providers (which skipped half the run and finished green), absent
// fixtures, and cancellation. This module gives every (suite, provider)
// pair a named outcome, an aggregate that never launders a partial run
// into 'passed', a step-summary renderer, and a strict reader contract
// for the release gate (scripts/release-contract-gate.mjs).
//
// Pure functions first, CLI second, so `node --test` exercises the
// vocabulary without a workflow run. Outcome vocabulary (closed):
//   passed | failed | skipped-missing-secret | skipped-disabled |
//   skipped-no-fixtures | cancelled
// 'cancelled' is written by the READER for a run whose conclusion is
// cancelled (a cancelled job cannot write its own artifact); the writer
// side never emits it.
import { readFileSync, writeFileSync } from 'node:fs';

export const CLASSIFICATION_SCHEMA = 1;

export const OUTCOMES = [
  'passed',
  'failed',
  'skipped-missing-secret',
  'skipped-disabled',
  'skipped-no-fixtures',
  'cancelled',
];

/** Every suite the workflow runs, with the providers each addresses. */
export const SUITE_MATRIX = [
  { suite: 'vcr-contract', provider: 'anthropic' },
  { suite: 'vcr-contract', provider: 'openai' },
  { suite: 'caps-audit', provider: 'anthropic' },
  { suite: 'rates-audit', provider: 'docs-pages' },
];

/** A fresh classification document; disabled fills every row at once. */
export function initClassification({ sha, enabled }) {
  const rows = enabled
    ? []
    : SUITE_MATRIX.map((cell) => ({
        ...cell,
        outcome: 'skipped-disabled',
        detail: 'CONTRACT_TESTS_ENABLED is not true; the program is off by owner decision',
      }));
  return {
    schema: CLASSIFICATION_SCHEMA,
    workflow: 'contract-tests',
    sha,
    enabled: Boolean(enabled),
    suites: rows,
  };
}

/** Records one (suite, provider) outcome; replaces a prior row for the pair. */
export function recordOutcome(doc, { suite, provider, outcome, detail, checks, failures }) {
  if (!OUTCOMES.includes(outcome)) {
    throw new Error(`unknown outcome '${outcome}'; the vocabulary is ${OUTCOMES.join(', ')}`);
  }
  if (!SUITE_MATRIX.some((cell) => cell.suite === suite && cell.provider === provider)) {
    throw new Error(`unknown suite/provider pair '${suite}/${provider}'`);
  }
  const suites = doc.suites.filter((row) => !(row.suite === suite && row.provider === provider));
  suites.push({
    suite,
    provider,
    outcome,
    ...(detail === undefined ? {} : { detail }),
    ...(checks === undefined ? {} : { checks: Number(checks) }),
    ...(failures === undefined ? {} : { failures: Number(failures) }),
  });
  return { ...doc, suites };
}

/**
 * The aggregate verdict: 'passed' ONLY when every cell of the matrix
 * reports passed. Any failed or cancelled cell fails the aggregate; any
 * skip makes it a NAMED partial (one key of two is a partial run, never
 * a green one), listing exactly what did not run.
 */
export function aggregateOutcome(doc) {
  const byPair = new Map(doc.suites.map((row) => [`${row.suite}/${row.provider}`, row]));
  const missing = SUITE_MATRIX.filter((cell) => !byPair.has(`${cell.suite}/${cell.provider}`)).map(
    (cell) => `${cell.suite}/${cell.provider}`,
  );
  const failed = doc.suites.filter(
    (row) => row.outcome === 'failed' || row.outcome === 'cancelled',
  );
  const skipped = doc.suites.filter((row) => row.outcome.startsWith('skipped-'));
  if (failed.length > 0) {
    return {
      verdict: 'failed',
      detail: failed.map((row) => `${row.suite}/${row.provider}: ${row.outcome}`),
    };
  }
  if (missing.length > 0) {
    return { verdict: 'partial', detail: missing.map((pair) => `${pair}: unreported`) };
  }
  if (skipped.length > 0) {
    return {
      verdict: 'partial',
      detail: skipped.map((row) => `${row.suite}/${row.provider}: ${row.outcome}`),
    };
  }
  return { verdict: 'passed', detail: [] };
}

/** The step-summary and release-notes renderer: one line per cell. */
export function renderClassification(doc) {
  const aggregate = aggregateOutcome(doc);
  const lines = [
    `Live contract classification (sha ${doc.sha}): ${aggregate.verdict}`,
    ...doc.suites
      .slice()
      .sort((a, b) => (`${a.suite}/${a.provider}` < `${b.suite}/${b.provider}` ? -1 : 1))
      .map(
        (row) =>
          `- ${row.suite}/${row.provider}: ${row.outcome}` +
          (row.checks === undefined
            ? ''
            : ` (${row.checks} checks, ${row.failures ?? 0} failures)`) +
          (row.detail === undefined ? '' : `: ${row.detail}`),
      ),
    ...aggregate.detail.map((line) => `- aggregate: ${line}`),
  ];
  return lines.join('\n');
}

/** Validates a document the release gate downloaded; throws on junk. */
export function requireClassification(doc) {
  if (typeof doc !== 'object' || doc === null) {
    throw new Error('classification is not an object');
  }
  if (doc.schema !== CLASSIFICATION_SCHEMA) {
    throw new Error(`classification schema ${String(doc.schema)} is not ${CLASSIFICATION_SCHEMA}`);
  }
  if (doc.workflow !== 'contract-tests') {
    throw new Error(`classification workflow '${String(doc.workflow)}' is not contract-tests`);
  }
  if (typeof doc.sha !== 'string' || !/^[0-9a-f]{40}$/.test(doc.sha)) {
    throw new Error('classification sha is not a 40-hex commit');
  }
  if (!Array.isArray(doc.suites)) {
    throw new Error('classification suites is not an array');
  }
  for (const row of doc.suites) {
    if (!OUTCOMES.includes(row.outcome)) {
      throw new Error(`classification row carries unknown outcome '${String(row.outcome)}'`);
    }
  }
  return doc;
}

const loadDoc = (file) => JSON.parse(readFileSync(file, 'utf8'));

// ---- CLI: init | record | summary (workflow plumbing; tested via the
// pure functions above). Importing this module must never run the CLI
// (the mutation-probe RV2603 rule): node --test imports it with the
// runner's own argv in place.
const [, , command, ...rest] = process.argv;
const arg = (name) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : undefined;
};
const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;

if (!isEntrypoint) {
  // Imported for the pure functions; the CLI stays quiet.
} else if (command === 'init') {
  const out = arg('out');
  const doc = initClassification({
    sha: arg('sha') ?? '',
    enabled: arg('enabled') === 'true',
  });
  writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`[contract-classification] initialized ${out} (enabled=${String(doc.enabled)})`);
} else if (command === 'record') {
  const out = arg('out');
  const doc = recordOutcome(loadDoc(out), {
    suite: arg('suite'),
    provider: arg('provider'),
    outcome: arg('outcome'),
    detail: arg('detail'),
    checks: arg('checks'),
    failures: arg('failures'),
  });
  writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(
    `[contract-classification] recorded ${arg('suite')}/${arg('provider')}: ${arg('outcome')}`,
  );
} else if (command === 'summary') {
  console.log(renderClassification(requireClassification(loadDoc(arg('file')))));
} else if (command !== undefined) {
  console.error(`unknown command '${command}'; use init | record | summary`);
  process.exit(2);
}
