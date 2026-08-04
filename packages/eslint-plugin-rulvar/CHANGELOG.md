# eslint-plugin-rulvar

## 1.178.0

## 1.177.0

## 1.176.0

## 1.175.0

## 1.174.0

## 1.173.0

## 1.172.0

## 1.171.0

## 1.170.0

## 1.169.0

## 1.168.0

## 1.167.0

## 1.166.0

## 1.165.0

## 1.164.0

## 1.163.0

## 1.162.0

## 1.161.0

## 1.160.0

## 1.159.0

## 1.158.0

## 1.157.0

## 1.156.0

## 1.155.0

## 1.154.0

## 1.153.0

## 1.152.0

## 1.151.0

## 1.150.0

## 1.149.0

## 1.148.0

## 1.147.0

## 1.146.0

## 1.145.0

## 1.144.0

## 1.143.0

## 1.142.0

## 1.141.0

## 1.140.0

## 1.139.0

## 1.138.0

## 1.137.0

## 1.136.0

## 1.135.0

## 1.134.0

## 1.133.0

## 1.132.0

## 1.131.0

## 1.130.0

## 1.129.0

## 1.128.0

## 1.127.0

## 1.126.0

## 1.125.0

## 1.124.0

## 1.123.0

## 1.122.0

## 1.121.0

## 1.120.0

## 1.119.0

## 1.118.0

## 1.117.0

## 1.116.0

## 1.115.0

## 1.114.0

## 1.113.0

## 1.112.0

## 1.111.0

## 1.110.0

## 1.109.0

## 1.108.0

## 1.107.0

## 1.106.0

## 1.105.0

## 1.104.0

## 1.103.0

## 1.102.0

## 1.101.0

## 1.100.0

## 1.99.1

## 1.99.0

## 1.98.0

## 1.97.0

## 1.96.0

## 1.95.0

## 1.94.0

## 1.93.0

## 1.92.0

## 1.91.0

## 1.90.0

## 1.89.0

## 1.88.0

## 1.87.0

## 1.86.0

## 1.85.0

## 1.84.0

## 1.83.0

## 1.82.0

## 1.81.2

## 1.81.1

## 1.81.0

## 1.80.0

## 1.79.0

## 1.78.0

## 1.77.0

## 1.76.0

## 1.75.1

## 1.75.0

## 1.74.0

## 1.73.0

## 1.72.0

## 1.71.0

## 1.70.1

## 1.70.0

## 1.69.0

## 1.68.0

## 1.67.0

## 1.66.0

## 1.65.0

## 1.64.0

## 1.63.0

## 1.62.0

## 1.61.0

## 1.60.0

## 1.59.4

## 1.59.3

## 1.59.2

## 1.59.1

## 1.59.0

## 1.58.0

## 1.57.0

## 1.56.0

## 1.55.0

## 1.54.0

## 1.53.0

## 1.52.0

## 1.51.0

## 1.50.0

## 1.49.0

## 1.48.0

## 1.47.0

## 1.46.0

## 1.45.0

## 1.44.1

## 1.44.0

## 1.43.0

## 1.42.0

## 1.41.0

## 1.40.0

## 1.39.0

### Minor Changes

- 0cff035: Close the dynamic code generation parity gap in the planner sandbox dialect (v1.38.0 review P2-CODEGEN-PARITY).

  `compileScript` and the `rulvar/no-code-generation` ESLint rule now share one AST policy (`scanDialect`), so both reach the same decision for every statically visible constructor reconstruction form: `.constructor`, `["constructor"]`, a computed key that folds to the constant, `{ constructor: x }` destructuring, and `Reflect.get(fn, "constructor")`. The previous regex compile gate matched only the dotted form, so a bracket or computed key passed compile while the linter flagged some of them; moving to an AST also drops the regex false positives, where a property merely named `eval`, `Function`, or `constructor` was wrongly rejected.

  A key assembled only at runtime (`fn[parts.join("")]`) cannot be decided statically without rejecting every dynamic property access, so the worker realm now neutralizes the constructor reconstruction path at runtime by replacing the `constructor` slot on all four Function family prototypes with a thrower. A script that compiles clean can no longer reach the Function constructor through a dynamic key.

  The planner and orchestration docs are corrected to state the exact boundary: the dialect rejects the statically visible forms and the worker neutralizes the runtime path, but a worker in the same process shares its intrinsics with the code it runs and remains a determinism and blast radius boundary, not a hostile code wall.

## 1.38.0

### Minor Changes

- 3e2d591: Reject dynamic code generation in the planner sandbox dialect (v1.37.0 review SEC-P2). `compileScript` banned `import` but not `eval`, the `Function` constructor, or `.constructor` access, so a machine script could reach the Function constructor and compile a dynamic import the literal scan never saw, recovering the import allowlist and, through `node:child_process`, arbitrary host capability at run status `ok`. `compileScript` now rejects `eval`, `Function`, and `.constructor` (diagnostic ids `no-eval`, `no-function-constructor`, `no-constructor-access`); a new `rulvar/no-code-generation` ESLint rule carries the same ban into the `workflows` preset and the self repair loop; and the worker additionally unbinds `eval` and `Function` as defense in depth. This keeps the import allowlist meaningful and the dialect consistent. It is not a hostile code boundary, which the sandbox has never claimed to be: JavaScript intrinsics can still reconstruct the constructors, so the docs continue to call the sandbox a determinism and blast radius boundary, not a security one.

## 1.37.0

## 1.36.0

## 1.35.0

## 1.34.0

## 1.33.0

## 1.32.0

## 1.31.0

## 1.30.0

## 1.29.0

## 1.28.0

## 1.27.0

## 1.26.0

## 1.25.0

## 1.24.1

## 1.24.0

## 1.23.0

## 1.22.0

## 1.21.0

## 1.20.0

## 1.19.0

## 1.18.0

## 1.17.0

## 1.16.2

## 1.16.1

## 1.16.0

## 1.15.0

## 1.14.0

## 1.13.0

## 1.12.0

## 1.11.0

## 1.10.0

## 1.9.0

## 1.8.0

## 1.7.0

## 1.6.0

### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.

## 1.5.2

## 1.5.1

## 1.5.0

## 1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.

## 1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.

## 1.1.0

## 1.0.0

## 0.9.0

## 0.8.0

## 0.7.0

### Minor Changes

- 4aaf2d5: M6-T03: the determinism rule set with structural JSON diagnostics (docs/06 8.4). Rules: no-bare-date (Date.now and new Date), no-bare-random (Math.random), no-fetch (bare and globalThis.fetch), no-process-env, no-promise-all-over-ctx (Promise.all/allSettled/race/any spawning ctx or bare sandbox calls; ctx.parallel instead), and the duplicate-identical-call advisory (byte-identical ctx.agent/ctx.workflow calls in one function forward-match to one journal entry; opts.key distinguishes deliberate repeats). Locally shadowed globals are never flagged. The flat preset `configs.workflows` wires every rule at its intended severity, and `toJsonDiagnostics` projects lint messages into the machine-readable shape the mode (b) self-repair loop consumes.

## 0.6.0

## 0.5.0

## 0.4.0

## 0.3.0

## 0.2.0

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.
