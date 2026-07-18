// Single root Vitest config (docs/11, section "Pyramid and tooling"): one
// `vitest run` executes every project; per-package Vitest configs are
// forbidden.
//
// Cross-package imports in tests (the umbrella importing @rulvar/core, the
// adapters from M1-T12 onward) resolve through the packages' exports maps,
// which point at dist/: build before testing (`pnpm build`, cheap and
// cached under Turborepo; CI test jobs do the same).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { ensureRunScopedMemoDir } from './scripts/vitest-warning-dedupe.mjs';

// Run-scoped memo dir for the warning dedupe below: workers inherit the
// env, so the first RulvarWarning per code prints once per RUN, not
// once per per-file fork. The dir is removed when this (main) process
// exits.
ensureRunScopedMemoDir();

// 'packages/*' plus 'examples', expanded by hand: glob-string projects
// inherit nothing from this config, and each project must inherit the
// warning-dedupe setup below (`extends: true`), so every project is an
// inline entry. Names come from each package.json, matching what the
// glob form displayed.
const projectRoots = [
  ...readdirSync(fileURLToPath(new URL('./packages', import.meta.url))).map(
    (dir) => `packages/${dir}`,
  ),
  'examples',
].filter((root) => existsSync(fileURLToPath(new URL(`./${root}/package.json`, import.meta.url))));

export default defineConfig({
  test: {
    // Per worker process: keep the first RulvarWarning per code, swallow
    // the hundreds of deliberate fixture repeats that made the suite
    // output ~85 percent duplicate advisory lines.
    setupFiles: [
      fileURLToPath(new URL('./scripts/vitest-warning-dedupe.setup.mjs', import.meta.url)),
    ],
    projects: projectRoots.map((root) => ({
      extends: true,
      test: {
        root,
        name: (
          JSON.parse(
            readFileSync(fileURLToPath(new URL(`./${root}/package.json`, import.meta.url)), 'utf8'),
          ) as { name: string }
        ).name,
      },
    })),
    coverage: {
      provider: 'v8',
      // TS sources only: a bare src/** also feeds non-code files (the
      // vendored json-schema README) to the coverage transform, which
      // fails to parse them and prints a Rolldown stack trace.
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      // Ratchet floors (v1.17.0 review): seeded just below the measured
      // baseline of 2026-07-18 (statements 86.19, branches 77.47,
      // functions 87.00, lines 86.31); functions gets one point of
      // headroom because it sat exactly on the integer. Raise these as
      // coverage grows; never lower them to admit a regression. Known
      // instrumentation gap, deliberate: code executing inside worker
      // threads (packages/planner/src/sandbox-worker.ts) and child
      // processes reports 0% here; its behavior is covered end to end
      // through the host-side sandbox tests.
      thresholds: {
        statements: 86,
        branches: 77,
        functions: 86,
        lines: 86,
      },
    },
  },
});
