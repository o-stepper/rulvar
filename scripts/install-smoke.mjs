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

// The REGISTRY compat artifact rides the same (only) network step: the
// immutability gate proves a fresh pack matches the published bytes, and
// this proves the artifact npm users actually download (with its own
// nested frozen core dependency) interoperates with the CURRENT core.
// During a compat release PR the bumped version is not published yet, so
// fall back to the latest published artifact.
const compatSourceVersion = JSON.parse(
  readFileSync(join(process.cwd(), 'packages', 'compat', 'package.json'), 'utf8'),
).version;
const compatPackument = await (await fetch('https://registry.npmjs.org/@rulvar/compat')).json();
const compatVersion =
  compatPackument.versions?.[compatSourceVersion] === undefined
    ? compatPackument['dist-tags'].latest
    : compatSourceVersion;
if (compatVersion !== compatSourceVersion) {
  console.log(
    `[install-smoke] compat ${compatSourceVersion} is not published yet; smoking ${compatVersion}`,
  );
}

writeFileSync(
  join(scratch, 'package.json'),
  JSON.stringify({ name: 'smoke', private: true, type: 'module' }, null, 2),
);
execFileSync(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    ...tarballs.map((file) => `./${file}`),
    `@rulvar/compat@${compatVersion}`,
  ],
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

// The registry compat artifact next to the current core, offline: the
// frozen deriver's golden values (hashVersion, foldDefaults, the round-1
// disposition table, the effort-insensitive projection) and the current
// buildDeriverRegistry accepting it, plus the dependency layout: compat
// must resolve exactly the core version it froze against, never a
// hoisted current one (the DEF-6 cassette replays stay in the workspace
// suite; this is the published-artifact interop check).
writeFileSync(
  join(scratch, 'compat-smoke.mjs'),
  [
    "import { existsSync, readFileSync } from 'node:fs';",
    "import { buildDeriverRegistry } from '@rulvar/core';",
    "import { deriverV0Synthetic } from '@rulvar/compat';",
    "const compatManifest = JSON.parse(readFileSync('./node_modules/@rulvar/compat/package.json', 'utf8'));",
    "const declaredCore = compatManifest.dependencies['@rulvar/core'];",
    "const nestedPath = './node_modules/@rulvar/compat/node_modules/@rulvar/core/package.json';",
    'const resolvedCore = existsSync(nestedPath)',
    "  ? JSON.parse(readFileSync(nestedPath, 'utf8')).version",
    "  : JSON.parse(readFileSync('./node_modules/@rulvar/core/package.json', 'utf8')).version;",
    'if (resolvedCore !== declaredCore) {',
    '  console.error(`compat resolves core ${resolvedCore}, expected its frozen ${declaredCore}`);',
    '  process.exit(1);',
    '}',
    "if (deriverV0Synthetic.hashVersion !== 0) { console.error('compat deriver hashVersion drifted'); process.exit(1); }",
    'const fold = deriverV0Synthetic.foldDefaults;',
    "if (fold.effort !== 'medium' || fold.memoizeOutcome !== false || fold.budgetAccount !== 'root') {",
    "  console.error('compat foldDefaults drifted'); process.exit(1);",
    '}',
    'const table = deriverV0Synthetic.dispositionTable;',
    "if (table.ok !== 'replay' || table.limit !== 'rerun' || table.error !== 'rerun' || table.cancelled !== 'rerun' || table.running !== 'rerun') {",
    "  console.error('compat disposition table drifted'); process.exit(1);",
    '}',
    'const projected = deriverV0Synthetic.project({',
    "  kind: 'agent',",
    "  agentType: 'r',",
    "  modelSpec: { kind: 'model', model: 'a:m', effort: 'high' },",
    "  prompt: 'p',",
    "  schemaHash: 'x',",
    "  toolsetHash: 'y',",
    "  isolation: 'none',",
    '});',
    "if (projected === 'incomparable' || JSON.stringify(projected.modelSpec) !== JSON.stringify({ model: 'a:m' })) {",
    "  console.error('compat round-1 projection drifted'); process.exit(1);",
    '}',
    'const registry = buildDeriverRegistry([deriverV0Synthetic]);',
    'if (!registry.has(0) || !registry.has(1) || !registry.has(2)) {',
    "  console.error('current core rejects the frozen compat deriver'); process.exit(1);",
    '}',
    "console.log('registry compat install smoke: frozen deriver golden values ok with the current core');",
  ].join('\n'),
);
execFileSync('node', ['compat-smoke.mjs'], { cwd: scratch, stdio: 'inherit' });

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
    '// Explicit nulls stay typed without casts (v1.16 review P3): they',
    '// count as absent credentials, not as chosen ones.',
    'export const withTypedNulls = anthropic({',
    '  sdkOptions: {',
    '    apiKey: null,',
    '    authToken: null,',
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

// Executable docs snippets (v1.17.0 review): the canonical examples
// marked `<!-- docs-snippet: NAME -->` in docs/guide are extracted
// VERBATIM, typechecked in this packed consumer against the tarballs
// with the workspace compiler, and the hermetic ones run offline. Docs
// that drift from the shipped types now fail here, not on a reader's
// machine. `prelude` declares only what the doc prose legitimately
// elides (helpers defined around the fence).
const SNIPPETS = [
  { name: 'quickstart-anthropic', mode: 'typecheck' },
  { name: 'quickstart-openai-preset', mode: 'typecheck' },
  {
    name: 'tools-registered-names',
    mode: 'typecheck',
    prelude: [
      "import { tool, type ToolSource } from '@rulvar/core';",
      'const searchIssues = tool({',
      "  name: 'search-issues',",
      "  description: 'searches the tracker',",
      "  parameters: { type: 'object', properties: {} },",
      '  execute: () => Promise.resolve(null),',
      '});',
      "const deployService: ToolSource = { id: 'deploy', tools: () => Promise.resolve([]) };",
    ],
  },
  { name: 'testing-fake-adapter', mode: 'run' },
  {
    name: 'resume-replay',
    mode: 'typecheck',
    prelude: ['declare function fetchDiff(pr: number): Promise<string>;'],
  },
];
const guideDir = join(process.cwd(), 'docs', 'guide');
const snippetSources = new Map();
for (const file of readdirSync(guideDir).filter((name) => name.endsWith('.md'))) {
  const text = readFileSync(join(guideDir, file), 'utf8');
  for (const match of text.matchAll(
    /<!-- docs-snippet: (?<name>[a-z0-9-]+) -->\r?\n```ts\r?\n(?<code>[\s\S]*?)```/gu,
  )) {
    const { name, code } = match.groups;
    snippetSources.set(name, [...(snippetSources.get(name) ?? []), code]);
  }
}
for (const snippet of SNIPPETS) {
  const blocks = snippetSources.get(snippet.name);
  if (blocks === undefined) {
    console.error(`docs snippet '${snippet.name}' not found; check the markers in docs/guide`);
    process.exit(1);
  }
  const source = [...(snippet.prelude ?? []), ...blocks].join('\n');
  const fileName = `snippet-${snippet.name}.ts`;
  writeFileSync(join(scratch, fileName), source);
  const emit =
    snippet.mode === 'run' ? ['--outDir', join(scratch, 'snippet-dist')] : ['--noEmit'];
  execFileSync(
    pnpmBin,
    [
      ...pnpmPre,
      'exec',
      'tsc',
      '--strict',
      ...emit,
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--target',
      'es2023',
      '--skipLibCheck',
      join(scratch, fileName),
    ],
    { cwd: process.cwd(), stdio: 'inherit' },
  );
  if (snippet.mode === 'run') {
    writeFileSync(
      join(scratch, 'snippet-dist', 'package.json'),
      JSON.stringify({ type: 'module' }, null, 2),
    );
    execFileSync('node', [join('snippet-dist', `snippet-${snippet.name}.js`)], {
      cwd: scratch,
      stdio: 'inherit',
    });
  }
  console.log(`docs snippet ${snippet.name}: ${snippet.mode} ok`);
}

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
