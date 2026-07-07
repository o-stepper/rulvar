# @lurker/cli

## 0.6.0

### Minor Changes

- fa05007: M5-T01 workflow registry and the @lurker/cli base.

  - `@lurker/core` gains the per-engine `WorkflowRegistry` type and
    `defaults.workflows` on createEngine (docs/06 section 10.4): an
    explicit first-class value, no module-level registry; shells resolve
    by-name runs against it (ctx.workflow's string form arrives M6, the
    queue worker M8).
  - Spec-conformance fix: the M4-T09 quality floors option moves from the
    createEngine top level to its canonical home `defaults.roleFloors`
    (docs/06 section 10.1). Update `createEngine({ floors })` call sites
    to `createEngine({ defaults: { roleFloors } })`.
  - `@lurker/cli` ships its first real surface: the canonical grammar
    `lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N]`,
    `lurker resume <runId> [--args JSON] [--store PATH]`,
    `lurker runs ls [--store PATH]`, `lurker inspect <runId> [--store
PATH]` (no aliases), a line-oriented TUI progress renderer over the
    event stream, and interactive resolution of suspended approvals and
    externals (EOF leaves the run suspended, never errors). Engine
    assembly follows the host-config convention: `lurker.config.mjs`
    default-exports `{ engineOptions?, workflows? }`, a workflow module
    may export `workflow`/`engineOptions`/`workflows`, and --store selects
    the JsonlFileStore directory (default `.lurker`), so the CLI itself
    depends only on @lurker/core. The `lurker` bin is included; the
    resume/inspect grammar amendment (--args re-supply, --store symmetry)
    is recorded in docs/06 section 10.5.

- 9234dc8: M5-T03 cost reports. The CostReport builder moves to its own module
  (`engine/cost-report.ts`) and report totals become the LEDGER FOLD
  totals at settle: RunOutcome.usage and cost.totalUsd are computed from
  the journal's terminal entries (the same summation the kernel budget
  seed uses), so report totals equal ledger fold totals exactly, live and
  across resume, by construction. The new `costReportFromJournal(entries,
priceUsd)` is the pure fold for STORED runs: byModel and totals from
  terminal servedBy with abandoned subtrees contributing zero; phase,
  agentType, and role attribution are live-run facts that entries do not
  carry (byRole and the orchestrator block complete in M7 per DEF-7).
  Unpriced models keep surfacing, never as silent zeros. `lurker inspect`
  gains the cost view (total, byModel, unpriced) over the config-assembled
  price function (table wins over caps.pricing), and live run output
  prints the byModel/byPhase buckets.
- 8a41656: M5-T07 RunProfile presets and M5-T08 OTel exporter.

  - `engine/run-profiles.ts`: `RUN_PROFILES` (fast/standard/deep/ultra) and
    `runProfile(name)` ship the presets as pure DATA, bundles of per-role
    effort hints, per-run concurrency, budget, permission preset, and
    spawn limits, with no functions and no named model strings (named
    strong defaults stay in the umbrella). They are never engine
    semantics: a source-scan test asserts the engine has zero branches
    keyed on profile names. `lurker run --profile <name>` applies the
    chosen profile UNDER the host's own engine options (host always wins;
    the engine then sees only ordinary options), compiling the profile's
    permission preset into the engine deny/ask layers as data.
  - `@lurker/cli` gains `toOtel(run, tracer)`: it maps a settled run's
    spanId tree 1:1 onto OpenTelemetry spans (run > phase > agent > tool >
    child), with lurker.* and gen_ai.* attributes, start/end timestamps
    from the lifecycle events, and payload-only events attached as span
    events. Prompts, completions, and tool payloads are NEVER exported;
    replayed events never create duplicate spans. `@opentelemetry/api`
    ^1.9 is an optional peer dependency and the exporter is typed against
    a minimal structural TracerLike, so an absent OTel package never
    breaks the CLI.

### Patch Changes

- 5c8865d: M5 exit criterion coverage: prove the CLI works end to end against
  SqliteStore, not only JsonlFileStore (docs/10, section 3.6). A host
  config that supplies a SqliteStore as `engineOptions.stores.journal` is
  honored by the CLI's engine assembly (JsonlFileStore is only the default
  fallback), so run/suspend, runs ls, resume, and inspect all round-trip
  against sqlite through the same command paths. Added as a CLI e2e test.
- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @lurker/core@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @lurker/core@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @lurker/core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @lurker/core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @lurker/core@0.2.0

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @lurker/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

### Patch Changes

- Updated dependencies [f4e2be9]
  - @lurker/core@0.1.0
