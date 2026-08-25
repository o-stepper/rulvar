// The release-side live-contract gate (RV4306, P1.6): before anything
// publishes, READ the classification of the most recent completed
// contract-tests run, strictly. Reading is the whole posture: live
// contract runs are paid, so the release NEVER launches one; a missing
// or stale result refuses with the remediation "run the workflow and
// wait", and launching it stays a manual owner decision.
//
// Strict means every check the review demanded: the run must belong to
// the contract-tests workflow file, on the default branch, completed;
// a cancelled conclusion refuses; the artifact must exist, parse, and
// validate against the classification schema; the recorded sha must be
// an ancestor of the release commit; the run must be younger than the
// age bound. Any `failed` row refuses. Every `skipped-*` row is written
// to the notes file so the release notes carry it as a line.
//
// Environment: GH_TOKEN (gh CLI auth), GITHUB_REPOSITORY, GITHUB_SHA.
// Flags: --notes-out FILE (the skipped lines for the release notes),
// --max-age-days N (default 8), --disabled ("the program is off by
// repository variable": write the notes line and exit 0; an explicitly
// disabled program is an owner decision the gate records, not one it
// overrides).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  aggregateOutcome,
  renderClassification,
  requireClassification,
} from './contract-classification.mjs';

const argIndex = (name) => process.argv.indexOf(`--${name}`);
const argOf = (name) => {
  const index = argIndex(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const notesOut = argOf('notes-out');
const maxAgeDays = Number(argOf('max-age-days') ?? '8');
const repo = process.env.GITHUB_REPOSITORY ?? 'o-stepper/rulvar';
const releaseSha = process.env.GITHUB_SHA ?? '';

const refuse = (message, remediation) => {
  console.error(`[release-contract-gate] REFUSED: ${message}`);
  console.error(`[release-contract-gate] remediation: ${remediation}`);
  process.exit(1);
};

const notes = (lines) => {
  if (notesOut !== undefined) {
    writeFileSync(notesOut, `${lines.join('\n')}\n`);
  }
};

if (argIndex('disabled') >= 0) {
  console.log(
    '[release-contract-gate] the live contract program is disabled by repository ' +
      'variable; recorded for the release notes, nothing to read',
  );
  notes(['Live contracts: skipped-disabled (CONTRACT_TESTS_ENABLED is not true).']);
  process.exit(0);
}

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' });

const runs = JSON.parse(
  gh([
    'api',
    `repos/${repo}/actions/workflows/contract-tests.yml/runs?branch=main&status=completed&per_page=1`,
  ]),
);
const run = runs.workflow_runs?.[0];
if (run === undefined) {
  refuse(
    'no completed contract-tests run exists on main',
    'run the Contract tests workflow (workflow_dispatch) and wait for it to complete; ' +
      'the release never launches paid runs itself',
  );
}
if (!String(run.path ?? '').endsWith('.github/workflows/contract-tests.yml')) {
  refuse(
    `the latest run belongs to '${String(run.path)}', not the contract-tests workflow`,
    'verify the workflow identity; the gate reads only .github/workflows/contract-tests.yml',
  );
}
if (run.head_branch !== 'main') {
  refuse(`the latest run is on branch '${String(run.head_branch)}'`, 'run it on main');
}
if (run.conclusion === 'cancelled') {
  refuse(
    'the latest completed contract-tests run was cancelled',
    'run the workflow again and wait for a real conclusion',
  );
}
const ageMs = Date.now() - Date.parse(run.created_at);
if (!(ageMs <= maxAgeDays * 24 * 3600 * 1000)) {
  refuse(
    `the latest run is ${(ageMs / 86400000).toFixed(1)} days old (bound ${String(maxAgeDays)})`,
    'run the Contract tests workflow and wait; a stale classification proves nothing ' +
      'about the release commit',
  );
}

const artifacts = JSON.parse(gh(['api', `repos/${repo}/actions/runs/${String(run.id)}/artifacts`]));
const artifact = (artifacts.artifacts ?? []).find(
  (candidate) => candidate.name === 'contract-classification',
);
if (artifact === undefined) {
  // The migration window, named instead of laundered (RV4306): a run
  // that predates the classification writer carries no artifact. A
  // GREEN legacy run proves what the old workflow could prove (the
  // one-bit reality) and proceeds under an explicit legacy line in the
  // notes; a red or unclear legacy run refuses. The gate never
  // launches the paid run that would produce a real classification;
  // that stays the owner's manual decision, and the next scheduled
  // run retires this branch by existing.
  if (run.conclusion === 'success') {
    console.log(
      `[release-contract-gate] legacy green run ${String(run.id)} predates the ` +
        'classification writer; proceeding under the named legacy line',
    );
    notes([
      `Live contracts (run ${String(run.id)}): legacy green run without per-suite ` +
        'classification (predates RV4306); outcomes by suite and provider unavailable.',
    ]);
    process.exit(0);
  }
  refuse(
    `the latest completed run carries no contract-classification artifact and concluded ` +
      `'${String(run.conclusion)}'`,
    'fix the drift (docs/11 5.3), run the Contract tests workflow, and wait; the release ' +
      'never launches paid runs itself',
  );
}
const dir = mkdtempSync(join(tmpdir(), 'contract-classification-'));
execFileSync('gh', [
  'run',
  'download',
  String(run.id),
  '--repo',
  repo,
  '--name',
  'contract-classification',
  '--dir',
  dir,
]);
const fileName = readdirSync(dir).find((name) => name.endsWith('.json'));
if (fileName === undefined) {
  refuse('the downloaded artifact holds no json document', 'inspect the workflow upload step');
}
const doc = requireClassification(JSON.parse(readFileSync(join(dir, fileName), 'utf8')));

// The recorded sha must be an ancestor of the release commit: a
// classification of a commit outside this history proves nothing here.
// The job checkout is shallow: local git holds no commit object except
// the checked out one, so any other sha used to die here with a fatal
// instead of a verdict (every round push after a release refused
// exactly that way, with a classification one commit behind). Any
// local failure falls through to the compare API, which answers from
// the full graph; only a proven ancestry ('ahead' or 'identical')
// passes, and an API that cannot answer refuses.
const refuseAncestry = (detail) => {
  refuse(
    `the classification sha ${doc.sha} is not an ancestor of the release commit${detail}`,
    'run the Contract tests workflow on current main and wait',
  );
};
try {
  execFileSync('git', ['merge-base', '--is-ancestor', doc.sha, releaseSha || 'HEAD']);
} catch {
  if (releaseSha === '') {
    refuseAncestry(' (no GITHUB_SHA to ask the compare API about)');
  }
  let compared;
  try {
    compared = gh([
      'api',
      `repos/${repo}/compare/${doc.sha}...${releaseSha}?per_page=1`,
      '--jq',
      '.status',
    ]).trim();
  } catch {
    refuseAncestry(' (unresolvable in the shallow checkout, and the compare API refused)');
  }
  if (compared !== 'ahead' && compared !== 'identical') {
    refuseAncestry(` (the compare API answered '${String(compared)}')`);
  }
}

const aggregate = aggregateOutcome(doc);
console.log(renderClassification(doc));
if (aggregate.verdict === 'failed') {
  refuse(
    `the classification aggregate is failed (${aggregate.detail.join('; ')})`,
    'fix the drift (rerecord deliberately per docs/11 5.3), rerun the workflow, and wait',
  );
}
notes([
  `Live contracts (run ${String(run.id)}, sha ${doc.sha.slice(0, 12)}): ${aggregate.verdict}.`,
  ...doc.suites
    .filter((row) => row.outcome.startsWith('skipped-'))
    .map((row) => `- ${row.suite}/${row.provider}: ${row.outcome}`),
]);
console.log(`[release-contract-gate] ${aggregate.verdict}: the release may proceed`);
