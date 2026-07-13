// Publishes the bare `rulvar` pointer as the last step of the release
// script, via the npm trusted publisher configured for release.yml
// (OIDC, no tokens, provenance attached). Idempotent by three guards,
// so it is safe on every run:
//   1. the pointer version must equal the umbrella version
//      (scripts/sync-pointer.mjs keeps them in lockstep, and
//      scripts/check-fixed-group.mjs enforces it in CI);
//   2. the scoped release must already be live (the pointer's
//      dependency range has to resolve for installers), which holds by
//      construction because `pnpm publish -r` runs first;
//   3. the pointer version must not be on the registry yet.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

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

if (pointer.version !== umbrella.version) {
  console.error(
    `[publish-pointer] pointer ${pointer.version} does not match the umbrella ` +
      `${umbrella.version}; run node scripts/sync-pointer.mjs first`,
  );
  process.exit(1);
}
if (!published(`@rulvar/rulvar@${umbrella.version}`)) {
  console.log(
    `[publish-pointer] @rulvar/rulvar@${umbrella.version} is not on the registry yet; ` +
      'the scoped release publishes first, nothing to do',
  );
  process.exit(0);
}
if (published(`rulvar@${pointer.version}`)) {
  console.log(`[publish-pointer] rulvar@${pointer.version} is already published; nothing to do`);
  process.exit(0);
}

execFileSync('pnpm', ['publish', '--publish-branch', 'main', '--no-git-checks'], {
  cwd: join(ROOT, 'pointer'),
  stdio: 'inherit',
});
console.log(`[publish-pointer] published rulvar@${pointer.version}`);
