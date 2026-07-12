// Pointer follow-up automation: the bare `rulvar` npm name republishes
// at the umbrella's version each release. This script rewrites
// pointer/package.json (version and the @rulvar/rulvar range) from
// packages/rulvar/package.json; it runs inside the root
// `version-packages` script, so the standing Version Packages PR
// carries the bump, and scripts/check-fixed-group.mjs fails CI when
// the two ever drift. Publishing the pointer stays a manual
// `npm publish` from pointer/ after the scoped release lands (the
// pointer is deliberately outside the workspace so `pnpm publish -r`
// and the OIDC trusted-publishing setup of the scoped packages never
// depend on it).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const umbrella = JSON.parse(readFileSync(join(ROOT, 'packages', 'rulvar', 'package.json'), 'utf8'));
const pointerPath = join(ROOT, 'pointer', 'package.json');
const raw = readFileSync(pointerPath, 'utf8');
const pointer = JSON.parse(raw);

const before = `${pointer.version} -> ${String(pointer.dependencies?.['@rulvar/rulvar'])}`;
pointer.version = umbrella.version;
pointer.dependencies = { ...pointer.dependencies, '@rulvar/rulvar': `^${umbrella.version}` };

const next = `${JSON.stringify(pointer, null, 2)}\n`;
if (next === raw) {
  console.log(`[sync-pointer] pointer already tracks the umbrella at ${umbrella.version}`);
} else {
  writeFileSync(pointerPath, next);
  console.log(
    `[sync-pointer] pointer ${before} rewritten to ${umbrella.version} -> ^${umbrella.version}`,
  );
}
