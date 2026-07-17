// Packed CLI optional-companion matrix (the v1.16.1 review P1): the
// published binary, not the source command functions, exercised in
// isolated npm consumers outside the workspace, with no hoisting and no
// imports from source. v1.16.1 shipped a CLI whose tsdown build inlined
// the three command-local companions: `rulvar plan` failed with a false
// "install @rulvar/planner" WITH the planner installed (the inlined
// eslint broke on `__filename` in ESM scope and a bare catch ate it),
// while `rulvar kb inbox` ran WITHOUT @rulvar/plan installed. This gate
// packs the real tarballs and proves all three contracts:
//
//   1. bare consumer (cli + core only): help/run/resume/runs ls/inspect
//      respond per grammar, every optional command reports its exact
//      missing companion, dist keeps the three `import("@rulvar/...")`
//      specifiers and stays companion-free (size ceiling).
//   2. companion consumer: plan --dry-run prints the accepted script,
//      full plan executes through the WorkerSandboxRunner, kb
//      inbox/gate/sweep execute their features against the store.
//   3. broken-companion consumer: a synthetic init failure inside an
//      INSTALLED planner surfaces with its cause and is never
//      misreported as a missing install.
//
// The npm installs are the only network steps (registry eslint rides
// in as the planner's dependency). Run via `node scripts/cli-smoke.mjs`
// (PNPM_CMD overrides the pnpm executable).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pnpmCmd = process.env.PNPM_CMD ?? 'pnpm';
const [pnpmBin, ...pnpmPre] = pnpmCmd.split(' ');
const root = process.cwd();

const PACK_DIRS = [
  'packages/core',
  'packages/cli',
  'packages/planner',
  'packages/plan',
  'packages/evals',
  'packages/testing',
  'packages/eslint-plugin-rulvar',
];
const packDest = mkdtempSync(join(tmpdir(), 'rulvar-cli-smoke-pack-'));
for (const dir of PACK_DIRS) {
  execFileSync(pnpmBin, [...pnpmPre, 'pack', '--pack-destination', packDest], {
    cwd: join(root, dir),
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
const packed = readdirSync(packDest).filter((file) => file.endsWith('.tgz'));
function tarball(prefixRe) {
  const file = packed.find((candidate) => prefixRe.test(candidate));
  if (file === undefined) {
    console.error(`no packed tarball matches ${String(prefixRe)}; found: ${packed.join(', ')}`);
    process.exit(1);
  }
  return join(packDest, file);
}
const CORE = tarball(/^rulvar-core-/);
const CLI = tarball(/^rulvar-cli-/);
const PLANNER = tarball(/^rulvar-planner-/);
const PLAN = tarball(/^rulvar-plan-\d/);
const EVALS = tarball(/^rulvar-evals-/);
const TESTING = tarball(/^rulvar-testing-/);
const ESLINT_PLUGIN = tarball(/^eslint-plugin-rulvar-/);

function makeConsumer(name) {
  const dir = mkdtempSync(join(tmpdir(), `rulvar-cli-smoke-${name}-`));
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: `cli-smoke-${name}`, private: true, type: 'module' }, null, 2),
  );
  return dir;
}
function npmInstall(dir, specs) {
  execFileSync('npm', ['install', '--no-audit', '--no-fund', ...specs], {
    cwd: dir,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
function rulvar(dir, args) {
  const result = spawnSync(join(dir, 'node_modules', '.bin', 'rulvar'), args, {
    cwd: dir,
    encoding: 'utf8',
  });
  return { code: result.status, out: result.stdout ?? '', err: result.stderr ?? '' };
}

let failures = 0;
function check(label, result, expected) {
  const problems = [];
  if (expected.code !== undefined && result.code !== expected.code) {
    problems.push(`exit ${String(result.code)} != ${String(expected.code)}`);
  }
  for (const text of expected.outIncludes ?? []) {
    if (!result.out.includes(text)) {
      problems.push(`stdout misses: ${text}`);
    }
  }
  for (const text of expected.errIncludes ?? []) {
    if (!result.err.includes(text)) {
      problems.push(`stderr misses: ${text}`);
    }
  }
  for (const text of expected.errExcludes ?? []) {
    if (result.err.includes(text)) {
      problems.push(`stderr must not contain: ${text}`);
    }
  }
  if (problems.length > 0) {
    failures += 1;
    console.error(`FAIL ${label}:`);
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    console.error(`  stdout: ${result.out.slice(0, 500)}`);
    console.error(`  stderr: ${result.err.slice(0, 500)}`);
  } else {
    console.log(`ok ${label}`);
  }
}

const MISSING_PLANNER =
  'rulvar plan requires @rulvar/planner (the plan agent, compileScript, and the worker ' +
  'sandbox live there); install it next to the CLI';
const MISSING_PLAN_INBOX =
  'rulvar kb inbox requires @rulvar/plan (the RunLedger fold behind the LedgerExport seam)';
const MISSING_PLAN_GATE =
  'rulvar kb gate requires @rulvar/plan (the RunLedger fold behind the LedgerExport seam)';
const MISSING_EVALS =
  'rulvar kb sweep requires @rulvar/evals (matrix sweeps, the eval-committer identity, ' +
  'and the canary live there); install it next to the CLI';

// ---- Consumer 1: the bare CLI ---------------------------------------
const bare = makeConsumer('bare');
npmInstall(bare, [CORE, CLI]);

// Dist text contract: the three dynamic specifiers survive as real
// imports, and the dist stays companion-free (the bundled eslint alone
// was megabytes; the honest CLI is well under this ceiling).
const distDir = join(bare, 'node_modules', '@rulvar', 'cli', 'dist');
const distFiles = readdirSync(distDir);
const distText = distFiles
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(join(distDir, file), 'utf8'))
  .join('\n');
for (const specifier of ['@rulvar/planner', '@rulvar/plan', '@rulvar/evals']) {
  if (!distText.includes(`import("${specifier}")`)) {
    failures += 1;
    console.error(`FAIL dist contract: dynamic specifier ${specifier} was rewritten away`);
  }
}
const distBytes = distFiles.reduce((sum, file) => sum + statSync(join(distDir, file)).size, 0);
if (distBytes > 512_000) {
  failures += 1;
  console.error(
    `FAIL dist contract: cli dist is ${String(distBytes)} bytes; a companion is likely bundled again`,
  );
} else {
  console.log(`ok dist contract (${String(distBytes)} bytes, specifiers preserved)`);
}

check('bare --help', rulvar(bare, ['--help']), { code: 0, outIncludes: ['rulvar'] });
check('bare runs ls', rulvar(bare, ['runs', 'ls']), { code: 0 });
check('bare run usage', rulvar(bare, ['run']), { code: 1, errIncludes: ['error:'] });
check('bare resume usage', rulvar(bare, ['resume']), { code: 1, errIncludes: ['error:'] });
check('bare inspect missing run', rulvar(bare, ['inspect', 'nope']), {
  code: 1,
  errIncludes: ['error:'],
});
check('bare plan reports the missing planner', rulvar(bare, ['plan', 'goal', '--dry-run']), {
  code: 1,
  errIncludes: [MISSING_PLANNER],
  errExcludes: ['failed to load'],
});
check('bare kb inbox reports the missing plan', rulvar(bare, ['kb', 'inbox']), {
  code: 1,
  errIncludes: [MISSING_PLAN_INBOX],
});
check(
  'bare kb gate reports the missing plan',
  rulvar(bare, ['kb', 'gate', 'r1', '5', '--approver', 'smoke', '--ruled-out', 'prompt,tools']),
  { code: 1, errIncludes: [MISSING_PLAN_GATE] },
);
writeFileSync(
  join(bare, 'rulvar.config.mjs'),
  "export default { kbSweep: { committerId: 'smoke', models: [{ model: 'fake:model' }], cases: [] } };\n",
);
check('bare kb sweep reports the missing evals', rulvar(bare, ['kb', 'sweep']), {
  code: 1,
  errIncludes: [MISSING_EVALS],
});

// ---- Consumer 1 upgraded: companions installed ----------------------
npmInstall(bare, [PLANNER, PLAN, EVALS, TESTING, ESLINT_PLUGIN]);
writeFileSync(
  join(bare, 'rulvar.config.mjs'),
  [
    "import { FAKE_MODEL_REF, FakeAdapter } from '@rulvar/testing';",
    "import { WorkerSandboxRunner } from '@rulvar/planner';",
    '',
    'const GOOD_SCRIPT = [',
    "  '```js',",
    "  'const startedAt = now();',",
    '  "const result = await agent(\'work step\');",',
    "  'return { startedAt, result };',",
    "  '```',",
    "].join('\\n');",
    'const adapter = new FakeAdapter({',
    "  agents: { '*': (call) => (call.prompt.includes('GOAL:') ? GOOD_SCRIPT : 'worked') },",
    '});',
    '',
    'export default {',
    '  engineOptions: {',
    '    adapters: [adapter],',
    '    defaults: { routing: { plan: FAKE_MODEL_REF, loop: FAKE_MODEL_REF } },',
    '    runners: { sandbox: new WorkerSandboxRunner() },',
    '  },',
    "  kbSweep: { committerId: 'smoke', models: [{ model: FAKE_MODEL_REF }], cases: [] },",
    '};',
    '',
  ].join('\n'),
);
check(
  'installed plan --dry-run prints the accepted script',
  rulvar(bare, ['plan', 'smoke goal', '--dry-run']),
  {
    code: 0,
    outIncludes: ['const startedAt = now();'],
    errIncludes: ['plan: accepted'],
    errExcludes: [MISSING_PLANNER, 'failed to load'],
  },
);
const fullPlan = rulvar(bare, ['plan', 'smoke goal, executed']);
check('installed plan executes through the worker sandbox', fullPlan, {
  code: 0,
  errIncludes: ['runId:'],
  errExcludes: [MISSING_PLANNER, 'failed to load'],
});
const runId = /runId: (\S+)/.exec(fullPlan.err)?.[1];
if (runId === undefined) {
  failures += 1;
  console.error('FAIL: full plan printed no runId; downstream kb checks degraded');
}
check('installed runs ls lists the planned run', rulvar(bare, ['runs', 'ls']), {
  code: 0,
  ...(runId === undefined ? {} : { outIncludes: [runId] }),
});
check('installed kb inbox executes the fold', rulvar(bare, ['kb', 'inbox']), {
  code: 0,
  outIncludes: ['kb inbox:'],
  errExcludes: [MISSING_PLAN_INBOX],
});
check(
  'installed kb gate executes the lookup (feature error, not install advice)',
  rulvar(bare, [
    'kb',
    'gate',
    runId ?? 'r1',
    '999',
    '--approver',
    'smoke',
    '--ruled-out',
    'prompt,tools',
  ]),
  { code: 1, errIncludes: ['error:'], errExcludes: [MISSING_PLAN_GATE, 'failed to load'] },
);
check('installed kb sweep runs the matrix', rulvar(bare, ['kb', 'sweep']), {
  code: 0,
  outIncludes: ['pool: '],
  errExcludes: [MISSING_EVALS],
});

// ---- Consumer 2: an installed but BROKEN planner --------------------
const broken = makeConsumer('broken');
npmInstall(broken, [CORE, CLI, PLANNER, ESLINT_PLUGIN]);
const plannerIndex = join(broken, 'node_modules', '@rulvar', 'planner', 'dist', 'index.js');
writeFileSync(
  plannerIndex,
  `throw new Error('synthetic companion init failure');\n${readFileSync(plannerIndex, 'utf8')}`,
);
check(
  'broken planner surfaces its cause, never install advice',
  rulvar(broken, ['plan', 'goal', '--dry-run']),
  {
    code: 1,
    errIncludes: [
      'synthetic companion init failure',
      '@rulvar/planner is installed but failed to load',
    ],
    errExcludes: ['install it next to the CLI'],
  },
);

if (failures > 0) {
  console.error(`cli smoke FAILED: ${String(failures)} check(s)`);
  process.exit(1);
}
console.log('cli smoke passed: packed binary, companion matrix, and error classification ok');
