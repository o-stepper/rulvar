# eslint-plugin-rulvar

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
