// Umbrella install smoke test on packed tarballs (M1-T15 acceptance):
// pack @rulvar/core, both adapters, the umbrella, and the bare `rulvar`
// pointer; install the tarballs into a scratch project; import the
// umbrella and check the single-install surface; then check the pointer
// re-exports the identical surface and ships its type declarations. Run
// via `node scripts/install-smoke.mjs` (PNPM_CMD overrides the pnpm
// executable, e.g. 'corepack pnpm').
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pnpmCmd = process.env.PNPM_CMD ?? 'pnpm';
const [pnpmBin, ...pnpmPre] = pnpmCmd.split(' ');
const scratch = mkdtempSync(join(tmpdir(), 'rulvar-install-smoke-'));

const packDirs = [
  'packages/core',
  'packages/anthropic',
  'packages/openai',
  'packages/rulvar',
  'pointer',
];
for (const dir of packDirs) {
  execFileSync(pnpmBin, [...pnpmPre, 'pack', '--pack-destination', scratch], {
    cwd: join(process.cwd(), dir),
    stdio: 'inherit',
  });
}

const tarballs = readdirSync(scratch).filter((file) => file.endsWith('.tgz'));
if (tarballs.length !== packDirs.length) {
  console.error(`expected ${packDirs.length} tarballs, found:`, tarballs);
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
    "const umbrella = await import('@rulvar/rulvar');",
    "const pointer = await import('rulvar');",
    'const missing = Object.keys(umbrella).filter((key) => !(key in pointer));',
    'if (missing.length > 0) { console.error(`pointer misses umbrella exports: ${missing.join(", ")}`); process.exit(1); }',
    'console.log(`pointer install smoke: ${Object.keys(pointer).length} exports match the umbrella`);',
  ].join('\n'),
);
execFileSync('node', ['smoke.mjs'], { cwd: scratch, stdio: 'inherit' });

// The pointer must stay consumable from strict TypeScript: declarations
// on disk and a `types` condition on the root export (a missing pair is
// the TS7016 "implicitly has an any type" regression).
const pointerRoot = join(scratch, 'node_modules', 'rulvar');
if (!existsSync(join(pointerRoot, 'index.d.ts'))) {
  console.error('pointer package ships no index.d.ts');
  process.exit(1);
}
const pointerManifest = JSON.parse(readFileSync(join(pointerRoot, 'package.json'), 'utf8'));
if (pointerManifest.exports?.['.']?.types === undefined) {
  console.error('pointer exports["."] carries no types condition');
  process.exit(1);
}
console.log('install smoke passed');
