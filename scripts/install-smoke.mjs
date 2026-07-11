// Umbrella install smoke test on packed tarballs (M1-T15 acceptance):
// pack @rulvar/core, both adapters, and the umbrella; install the
// tarballs into a scratch project; import the umbrella and check the
// single-install surface. Run via `node scripts/install-smoke.mjs`
// (PNPM_CMD overrides the pnpm executable, e.g. 'corepack pnpm').
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pnpmCmd = process.env.PNPM_CMD ?? 'pnpm';
const [pnpmBin, ...pnpmPre] = pnpmCmd.split(' ');
const scratch = mkdtempSync(join(tmpdir(), 'rulvar-install-smoke-'));

const packages = ['core', 'anthropic', 'openai', 'rulvar'];
for (const name of packages) {
  execFileSync(pnpmBin, [...pnpmPre, 'pack', '--pack-destination', scratch], {
    cwd: join(process.cwd(), 'packages', name),
    stdio: 'inherit',
  });
}

const tarballs = readdirSync(scratch).filter((file) => file.endsWith('.tgz'));
if (tarballs.length !== packages.length) {
  console.error(`expected ${packages.length} tarballs, found:`, tarballs);
  process.exit(1);
}

writeFileSync(
  join(scratch, 'package.json'),
  JSON.stringify({ name: 'smoke', private: true, type: 'module' }, null, 2),
);
execFileSync(
  'npm',
  ['install', '--no-audit', '--no-fund', ...tarballs.map((file) => `./${file}`)],
  { cwd: scratch, stdio: 'inherit' },
);

writeFileSync(
  join(scratch, 'smoke.mjs'),
  [
    "import { createEngine, defineWorkflow, anthropic, openai, renderProgress, recommendedDefaults } from '@rulvar/rulvar';",
    'for (const [name, value] of Object.entries({ createEngine, defineWorkflow, anthropic, openai, renderProgress })) {',
    "  if (typeof value !== 'function') { console.error(`umbrella export ${name} missing`); process.exit(1); }",
    '}',
    "if (recommendedDefaults.routing.orchestrate === undefined) { console.error('recommendedDefaults missing'); process.exit(1); }",
    "console.log('umbrella install smoke: import surface ok');",
  ].join('\n'),
);
execFileSync('node', ['smoke.mjs'], { cwd: scratch, stdio: 'inherit' });
console.log('install smoke passed');
