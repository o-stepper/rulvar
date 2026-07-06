// Single root Vitest config (docs/11, section "Pyramid and tooling"): one
// `vitest run` executes every project; per-package Vitest configs are
// forbidden.
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
