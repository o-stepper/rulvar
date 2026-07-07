import { defineConfig } from 'tsdown';

export default defineConfig({
  // sandbox-worker.js is the worker_threads entry loaded by
  // WorkerSandboxRunner at runtime (new URL('./sandbox-worker.js', ...)).
  entry: ['src/index.ts', 'src/sandbox-worker.ts'],
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
