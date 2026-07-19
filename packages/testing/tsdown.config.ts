import { defineConfig } from 'tsdown';

export default defineConfig({
  // internal/cassettes is a repository-only entry: present in dist for
  // the root recorder scripts (which import it by file path), absent
  // from the exports map so no published specifier reaches it.
  entry: ['src/index.ts', 'src/matchers.ts', 'src/internal/cassettes.ts'],
  platform: 'node',
  dts: true,
  // Emit dist/index.js and dist/index.d.ts to match the committed exports
  // map (docs/13, section "package.json template").
  fixedExtension: false,
  // Built-in package-correctness hooks, wired on in addition to the explicit
  // CI pack gates (docs/13, section "Build: tsdown, typecheck via tsc").
  publint: true,
  attw: { profile: 'esm-only' },
});
