# @lurker/testing

## 0.3.0

### Minor Changes

- 43444f6: M2-T11/T12: the executable store conformance kit and the M2 gating
  cassettes with frozen fixtures.

  @lurker/store-conformance ships its first real API: journalStoreConformance
  (A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4
  opaque payload with read-side-only normalization, meta separation, the
  golden fold-state fixture with a frozen reference hash, the decide-once
  oracle, and the abandon-derived-skip fixture) and leasableStoreConformance
  (typed LeaseHeldError on held acquire, monotonic fencing epochs,
  stale-epoch appends rejected and invisible, released leases fenced from
  renew and append, optional ttl/renew-cadence timing checks), plus
  registerConformance for Vitest/Jest and the stableStringify fold-state
  hasher. InMemoryStore and JsonlFileStore pass; deliberately broken stores
  (reordering, normalizing, tearing, fencing-less) fail loudly.

  @lurker/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
  abandon-covered hanging dispatch derives skipped instead of redispatching,
  abandon-covered operations contribute a zero ledger increment, the resume
  report lists covered entries as skipped (never orphaned), and an abandon
  over an already-resolved suspension folds to a noop with already_resolved
  (first-closing-wins per target, both closer kinds).

  @lurker/testing ships the M2 cassette suite over committed frozen
  fixtures: the DEF-1 synthetic subset (abandon-subtree, memoize-classifier,
  v1-journal-on-v2), the DEF-4 set (timeout-vs-live-race,
  class-decision-fanout, abandon-then-crash-then-resume,
  abandon-vs-resolution-race, offline-invalid-then-valid,
  double-abandon-idempotent), the DEF-6 six IDs (resume-v1-on-engine-v2,
  resume-v1-with-inserted-call, suspended-v1-resolves-on-v2,
  reject-version-too-old via deriverV0Synthetic, reject-version-from-future,
  effort-defaults-shift), the mandatory mixed-version scenarios
  (ordinal-space split, forward-cursor preference, cross-version
  resolution, the compatibility and never-pay-twice-through-upgrade
  lemmas), and KeyDeriver contract tests against the frozen v2 golden
  identities including the docs/03 worked example. Fixture regeneration is
  deliberate: scripts/record-m2-cassettes.mjs rebuilds, and CI write
  protection (scripts/check-frozen-fixtures.mjs plus fixtures.sha256)
  fails any fixture diff shipped without the explicit bump token (the
  hyphenated compound of hashVersion and bump) in a changeset.

- a1b35d3: M2-T09/T10: engine.resume under the run-to-definition binding contract
  (wf required for in-process runs, name mismatch is a typed ConfigError,
  body-hash mismatch warns loudly and proceeds; the compatibility scan
  runs strictly before any side effect; the resumed run seeds the budget
  from the ledger fold, re-emits open suspensions, and reports
  ResumePreview hits/misses/reruns/orphans plus invalid offline
  resolutions), the dryRun option (replay-strict matching: the first
  would-be-live call settles the run with the typed journal_miss error and
  zero live calls), and @lurker/testing replayRun (tier 3: strict replay
  of any journal with JournalMissError on ANY live call; suspended
  journals finish suspended with zero live calls).

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @lurker/core@0.3.0

## 0.2.0

### Minor Changes

- 5c4fc32: M1-T14/T15: @lurker/testing tier 1 (FakeAdapter matching on
  agentType/label/prompt regex with a '*' fallback, honoring the selected
  structured-output tier, zero USD by construction; createTestEngine over
  the full real engine with recorded event streams; toHaveCalledAgent and
  toStayUnderBudget matchers at '@lurker/testing/matchers') and the
  completed umbrella (re-exports of @lurker/core and both first-class
  adapters, renderProgress, the umbrella-only recommendedDefaults strong
  model slots, the M1 exit-criteria example workflow, and the CI install
  smoke on packed tarballs). The core now populates the reserved
  providerOptions 'lurker' telemetry namespace on every request (docs/04
  section 1.8 as amended) and AgentResult carries errorMessage detail for
  journaled WireError fidelity.

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
