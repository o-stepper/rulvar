// The pnpm pin guard (RV4411): assert BEFORE the Turbo fan-out that
// the pnpm actually running matches the packageManager pin, and fail
// with a named diagnosis instead of the mid-fan-out version-mismatch
// death the RV4306 bootstrap job documents. The direct path
// self-switches to the pin (the two supported entry paths in
// CONTRIBUTING "Toolchain"), so this guard is a tripwire for the
// third, broken path (an un-enabled Corepack launch exporting
// COREPACK_ROOT) and for any future toolchain drift: it turns "every
// Turbo child died on a version mismatch" into one line naming the
// running version, the pin, and the launch path. Diagnostic-first by
// design; the RV4306 behavioral gates stay the authority.
import { readFileSync } from 'node:fs';

const pin = String(
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).packageManager ??
    '',
).split('@')[1];
if (pin === undefined || pin === '') {
  console.error('assert-pnpm-pin: package.json carries no packageManager pnpm pin');
  process.exit(1);
}
const userAgent = process.env.npm_config_user_agent ?? '';
const match = /pnpm\/(\S+)/u.exec(userAgent);
if (match === null) {
  console.error(
    `assert-pnpm-pin: not launched through pnpm (user agent '${userAgent}'); ` +
      'run it as `pnpm run <script>` or `pnpm exec node scripts/assert-pnpm-pin.mjs` so the ' +
      'running package manager identifies itself',
  );
  process.exit(1);
}
if (match[1] !== pin) {
  console.error(
    `assert-pnpm-pin: the running pnpm is ${String(match[1])} but packageManager pins ${pin}; ` +
      'a Turbo fan-out under this mismatch dies per child with a bare version error. Launch ' +
      'pnpm directly (it self-switches to the pin) or through an ENABLED Corepack shim; the ' +
      'un-enabled `corepack pnpm` path exports COREPACK_ROOT and is the documented trap ' +
      '(RV4306, CONTRIBUTING "Toolchain").',
  );
  process.exit(1);
}
console.log(`assert-pnpm-pin: pnpm ${pin} matches the packageManager pin`);
