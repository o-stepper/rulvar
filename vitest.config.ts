// Single root Vitest config (docs/11, section "Pyramid and tooling"): one
// `vitest run` executes every project; per-package Vitest configs are
// forbidden.
//
// Cross-package imports in tests (the umbrella importing @lurker/core, the
// adapters from M1-T12 onward) resolve through the packages' exports maps,
// which point at dist/: build before testing (`pnpm build`, cheap and
// cached under Turborepo; CI test jobs do the same).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['**/*.test.ts'],
    },
  },
});
