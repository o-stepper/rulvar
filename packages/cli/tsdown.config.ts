import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  platform: 'node',
  dts: true,
  // Command-local optional companions stay REAL imports (the v1.16.1
  // review P1): bundling rewrote `import('@rulvar/planner')` into local
  // chunks whose inlined eslint broke at load time (`__filename` in ESM
  // scope), the failure was masked as "install it next to the CLI", and
  // `rulvar kb inbox` ran WITHOUT @rulvar/plan installed, against the
  // documented dependency contract. deps.neverBundle (the current name
  // of the deprecated top-level `external`; v1.22.0 review P4) keeps
  // the specifiers in
  // dist, so a missing companion is a real ERR_MODULE_NOT_FOUND and an
  // installed one loads from node_modules (where the planner's sandbox
  // worker actually lives; the inlined copy pointed at a worker file the
  // CLI never ships). This also drops the bundled eslint whose lazy
  // `jiti` import v1.16.1 had to externalize as a symptom.
  deps: { neverBundle: [/^@rulvar\/(planner|plan|evals)(\/|$)/] },
  // Emit dist/index.js and dist/index.d.ts to match the committed exports
  // map (docs/13, section "package.json template").
  fixedExtension: false,
  // Built-in package-correctness hooks, wired on in addition to the explicit
  // CI pack gates (docs/13, section "Build: tsdown, typecheck via tsc").
  publint: true,
  attw: { profile: 'esm-only' },
});
