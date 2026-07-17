// Umbrella install smoke test on packed tarballs (M1-T15 acceptance):
// pack @rulvar/core, both adapters, @rulvar/testing, the umbrella, and
// the bare `rulvar` pointer; install the tarballs into a scratch
// project; import the umbrella and check the single-install surface;
// check the pointer re-exports the identical surface and ships its type
// declarations; exercise the published live-smoke helpers at runtime;
// and typecheck the production auth contract (official SDK clients
// assignable to the adapter `client` option without casts) under strict
// NodeNext, as a consumer would, using the WORKSPACE TypeScript. The
// tarball npm install is the only network step; everything after runs
// with npm forced offline. Run via `node scripts/install-smoke.mjs`
// (PNPM_CMD overrides the pnpm executable, e.g. 'corepack pnpm').
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
  'packages/testing',
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

// The tarball install above is the ONLY step allowed to touch the
// registry (transitive deps: the provider SDKs, zod). Everything after
// runs offline; forcing it here makes any future registry access fail
// loudly (ENOTCACHED) instead of silently depending on a mutable
// latest, which is how an unpinned typescript slipped in (v1.15 review
// P3).
process.env.npm_config_offline = 'true';

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

// The published @rulvar/testing live helpers, exercised from the
// consumer side: the gate stays closed without the explicit opt-in even
// when the named key is present, the bounded smoke classifies a
// well-formed finish as ok, and an invalid bound rejects typed before
// any stream opens.
writeFileSync(
  join(scratch, 'live-smoke.mjs'),
  [
    "import { liveTestEnabled, runLiveSmoke, MAX_LIVE_SMOKE_ATTEMPTS } from '@rulvar/testing';",
    "if (liveTestEnabled('PATH')) { console.error('gate open without RULVAR_LIVE_TESTS=1'); process.exit(1); }",
    'const finish = {',
    "  type: 'finish',",
    "  finish: { reason: 'stop' },",
    '  usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },',
    '};',
    'const adapter = {',
    '  stream: async function* () {',
    '    yield finish;',
    '  },',
    '};',
    "const req = { model: 'm', messages: [] };",
    'const outcome = await runLiveSmoke(adapter, req, { baseDelayMs: 0 });',
    "if (outcome.status !== 'ok') { console.error('runLiveSmoke did not classify finish as ok'); process.exit(1); }",
    'const rejected = await runLiveSmoke(adapter, req, { attempts: MAX_LIVE_SMOKE_ATTEMPTS + 1 }).then(',
    "  () => 'resolved',",
    '  (error) => error.code,',
    ');',
    "if (rejected !== 'config') { console.error('invalid attempts did not reject with ConfigError'); process.exit(1); }",
    "console.log('live-smoke helpers install smoke: ok');",
  ].join('\n'),
);
execFileSync('node', ['live-smoke.mjs'], { cwd: scratch, stdio: 'inherit' });

// The production auth type contract, checked as a consumer would see it:
// under strict NodeNext the official SDK clients are directly assignable
// to the adapter `client` option, no casts (the v1.14 review's TS2322).
// The compiler is the WORKSPACE TypeScript (lockfile-pinned), never a
// mutable registry latest (v1.15 review P3): same tag + lockfile always
// checks with the same compiler, and this stage needs no network.
// NodeNext resolution starts at the fixture file, so its imports still
// come from the scratch project's freshly packed tarballs, not from
// workspace links.
const tscVersion = execFileSync(pnpmBin, [...pnpmPre, 'exec', 'tsc', '--version'], {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim();
console.log(`[install-smoke] auth type contract compiler: workspace ${tscVersion}`);
writeFileSync(
  join(scratch, 'auth-contract.ts'),
  [
    "import Anthropic from '@anthropic-ai/sdk';",
    "import OpenAI from 'openai';",
    "import { anthropic } from '@rulvar/anthropic';",
    "import { openai } from '@rulvar/openai';",
    '',
    "export const a = anthropic({ client: new Anthropic({ apiKey: 'sentinel', maxRetries: 0 }) });",
    "export const o = openai({ client: new OpenAI({ apiKey: 'sentinel', maxRetries: 0 }) });",
    'export const viaSdkOptions = anthropic({',
    '  sdkOptions: {',
    "    credentials: () => Promise.resolve({ token: 'sentinel-token', expiresAt: null }),",
    '  },',
    '});',
  ].join('\n'),
);
execFileSync(
  pnpmBin,
  [
    ...pnpmPre,
    'exec',
    'tsc',
    '--strict',
    '--noEmit',
    '--module',
    'nodenext',
    '--moduleResolution',
    'nodenext',
    '--target',
    'es2023',
    '--skipLibCheck',
    join(scratch, 'auth-contract.ts'),
  ],
  { cwd: process.cwd(), stdio: 'inherit' },
);
console.log('auth type contract install smoke: ok');

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
