// Publishes the bare `rulvar` pointer as the last step of the release
// script, via the npm trusted publisher configured for release.yml
// (OIDC, no tokens, provenance attached). Idempotent by three guards,
// so it is safe on every run:
//   1. the pointer version must equal the umbrella version
//      (scripts/sync-pointer.mjs keeps them in lockstep, and
//      scripts/check-fixed-group.mjs enforces it in CI);
//   2. the scoped release must already be live (the pointer's
//      dependency range has to resolve for installers);
//   3. the pointer version must not be on the registry yet.
//
// Guard 2 WAITS. The registry is eventually consistent on reads: `pnpm
// publish -r` returning means the WRITE landed, not that `npm view` can
// see it. This guard used to check once and reason that liveness "holds
// by construction because pnpm publish -r runs first", which is exactly
// the false premise: on the 1.5.0 train it read "not published" four
// seconds after the umbrella had been published, and skipped the pointer.
// A release is a write followed by a read of someone else's cache, so
// poll for the read path to catch up instead of assuming it already has.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = new URL('..', import.meta.url).pathname;

/** Bounded: a genuinely absent version must still fail fast enough to read the log. */
const PROPAGATION_ATTEMPTS = 12;
const PROPAGATION_DELAY_MS = 5_000;

const umbrella = JSON.parse(readFileSync(join(ROOT, 'packages', 'rulvar', 'package.json'), 'utf8'));
const pointer = JSON.parse(readFileSync(join(ROOT, 'pointer', 'package.json'), 'utf8'));

function published(spec) {
  try {
    execFileSync('npm', ['view', spec, 'version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** True as soon as the registry's read path serves `spec`, or false after the bound. */
async function waitForPublished(spec) {
  for (let attempt = 1; attempt <= PROPAGATION_ATTEMPTS; attempt += 1) {
    if (published(spec)) {
      return true;
    }
    if (attempt < PROPAGATION_ATTEMPTS) {
      console.log(
        `[publish-pointer] ${spec} is not visible yet (attempt ${attempt}/${PROPAGATION_ATTEMPTS}); ` +
          'waiting for the registry read path to catch up',
      );
      await sleep(PROPAGATION_DELAY_MS);
    }
  }
  return false;
}

if (pointer.version !== umbrella.version) {
  console.error(
    `[publish-pointer] pointer ${pointer.version} does not match the umbrella ` +
      `${umbrella.version}; run node scripts/sync-pointer.mjs first`,
  );
  process.exit(1);
}
// Cheap and exact: if the pointer is already out, nothing below matters,
// and this keeps a non-release push from waiting on the registry at all.
if (published(`rulvar@${pointer.version}`)) {
  console.log(`[publish-pointer] rulvar@${pointer.version} is already published; nothing to do`);
  process.exit(0);
}
if (!(await waitForPublished(`@rulvar/rulvar@${umbrella.version}`))) {
  console.error(
    `[publish-pointer] @rulvar/rulvar@${umbrella.version} never became visible on the registry ` +
      `after ${(PROPAGATION_ATTEMPTS * PROPAGATION_DELAY_MS) / 1000}s; the pointer must not ship ` +
      'ahead of the scoped release its dependency range resolves to. Re-run this job once the ' +
      'scoped release is live.',
  );
  process.exit(1);
}

execFileSync('pnpm', ['publish', '--publish-branch', 'main', '--no-git-checks'], {
  cwd: join(ROOT, 'pointer'),
  stdio: 'inherit',
});
console.log(`[publish-pointer] published rulvar@${pointer.version}`);
