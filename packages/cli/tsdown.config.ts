import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  platform: 'node',
  dts: true,
  // The bundled eslint (via @rulvar/planner's programmatic Linter)
  // lazily imports its optional TypeScript-config loader `jiti` inside
  // the config-file path the CLI never executes (repair rounds lint
  // with an inline config). External keeps that unreachable import as
  // an import instead of an UNRESOLVED_IMPORT build warning; jiti stays
  // uninstalled.
  external: [/^jiti(\/|$)/],
  // Emit dist/index.js and dist/index.d.ts to match the committed exports
  // map (docs/13, section "package.json template").
  fixedExtension: false,
  // Built-in package-correctness hooks, wired on in addition to the explicit
  // CI pack gates (docs/13, section "Build: tsdown, typecheck via tsc").
  publint: true,
  attw: { profile: 'esm-only' },
});
