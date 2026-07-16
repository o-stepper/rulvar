#!/usr/bin/env node
/**
 * test-live.mjs - the sanctioned way to run the key-gated live provider
 * tests (`pnpm test:live`).
 *
 * Ordinary `pnpm test` stays hermetic even when provider keys sit in the
 * shell: every live test is double-gated on RULVAR_LIVE_TESTS=1 AND its
 * provider key (liveTestEnabled in @rulvar/testing). This command is the
 * opt-in: it sets RULVAR_LIVE_TESTS=1 for its child vitest run ONLY,
 * reports which live suites will actually fire based on which keys are
 * present, and never prints key values.
 *
 * SPENDS PROVIDER BUDGET on every present key. Transient retryable
 * provider errors (429/529) get a bounded retry inside the smokes; a
 * persistent or non-retryable failure fails this command with the typed
 * diagnostics.
 *
 * Exit codes: 0 ok · 1 no provider key present, or the child run failed.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SUITES = [
  { file: 'packages/anthropic/src/index.test.ts', keys: ['ANTHROPIC_API_KEY'] },
  { file: 'packages/openai/src/index.test.ts', keys: ['OPENAI_API_KEY'] },
  { file: 'packages/bridge-ai-sdk/src/live.test.ts', keys: ['GOOGLE_GENERATIVE_AI_API_KEY'] },
  {
    file: 'packages/rulvar/src/example.test.ts',
    keys: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
  },
];

const present = (key) => process.env[key] !== undefined && process.env[key] !== '';

let runnable = 0;
for (const suite of SUITES) {
  const missing = suite.keys.filter((key) => !present(key));
  if (missing.length === 0) {
    runnable += 1;
    console.log(`[test-live] will run:   ${suite.file}`);
  } else {
    console.log(`[test-live] will skip:  ${suite.file} (missing ${missing.join(', ')})`);
  }
}

if (runnable === 0) {
  console.error(
    '\n[test-live] no provider key is present, nothing to run. Export at least one of ' +
      'ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY and re-run. ' +
      'Key values are read from the environment and never printed.',
  );
  process.exitCode = 1;
} else {
  console.log(
    '\n[test-live] live provider calls SPEND provider budget on every key listed above.\n',
  );
  const files = [...new Set(SUITES.map((suite) => suite.file))];
  const result = spawnSync('npx', ['vitest', 'run', ...files], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, RULVAR_LIVE_TESTS: '1' },
  });
  process.exitCode = result.status ?? 1;
}
