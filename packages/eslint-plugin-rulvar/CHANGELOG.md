# eslint-plugin-rulvar

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
