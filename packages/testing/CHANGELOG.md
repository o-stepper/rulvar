# @rulvar/testing

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

## 1.9.0

### Minor Changes

- 7577f8e: Correct the Anthropic fallback pricing to the official table and export versioned price tables from both first-party adapters.

  The `ANTHROPIC_MODELS` seed rows had never been audited against the published price list and overcharged every current Claude model: Fable 5 was seeded at exactly 2x the official rate (20/100 vs 10/50 per MTok, cache rates likewise), Opus 4.8 at 12/60 vs 5/25, Opus 4.7 at 10/50 vs 5/25, and Opus 4.6 at 15/75 vs 5/25. Claude Sonnet 5 now carries its introductory price (2/10, in effect through 2026-08-31); Haiku 4.5 and Sonnet 4.6 were already correct. Cost reports for affected models drop accordingly, and budget ceilings admit roughly twice the work they previously rejected.

  New exports `ANTHROPIC_PRICING` (`anthropic-2026-07-16`) and `OPENAI_PRICING` (`openai-2026-07-16`) publish the seed rows as versioned `PriceTable`s for `createEngine({ pricing })`, so runs journal a concrete pricing version instead of `unpriced` and price revisions become explicit table updates. `createTestEngine` gained a `pricing` passthrough for testing against a versioned table.

### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

## 1.6.0

### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- Updated dependencies [da4dbad]
- Updated dependencies [487da86]
- Updated dependencies [df416fc]
- Updated dependencies [a737810]
- Updated dependencies [9eb66b4]
  - @rulvar/core@1.6.0

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

## 1.4.0

### Minor Changes

- c4f563d: Production readiness fixes from the July 2026 full audit.

  - The `budgetUsd` ceiling now survives resume: the engine records it in `RunMeta.budgetUsd` and restores it on every resume, so the replayed spend counts against the original invocation's bound and `ResumeOptions` still exposes no way to raise it. Journals written before the field existed (or read through a store that drops optional `RunMeta` fields) resume uncapped, exactly as before; the conformance kit gains a round-trip check so custom stores cannot drop the field silently.
  - `spawn:rejected` and `resolution:applied` / `resolution:superseded` are now emitted: live admission rejections carry the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent only for pre-admission config gates), and live resolution attempts report winning or losing the first-closing-wins fold. `spawn:admitted` now carries the decision `entryRef` and the admitting `verdict` arm. The `orchestrator:budget` union member now types the two payload shapes actually emitted; `journal:compat` stays declared but unemitted (the scan runs before a run's event stream exists) and its TSDoc says so.
  - `toOtel` implements real parent-child span nesting when `contextApi` and `setSpan` are passed; without them spans stay flat but attributed.

  - `'readonly'` isolation now compiles a deny rule for tools declaring risk `write` or `destructive` into the spawn's permission chain, exactly as the tools guide documents; read tools and other isolation modes are unaffected.
  - VCR `replay()` refuses a cassette recorded outside the engine's hashVersion support window (`[CURRENT-1, CURRENT]`) with a typed `ConfigError` instead of silently drifting; in-window cassettes replay as before.
  - `InMemoryStore` accepts `{ quiet: true }` to opt out of the durability warning, and the warning text now states the precise truth: nothing survives a process exit and cross-process resume is impossible (same-process resume of a kept instance works). `createTestEngine` constructs its store quietly, so the blessed offline tier no longer prints a misleading warning.
  - The bare `Date.now()` / `Math.random()` development warnings no longer blame workflow code for calls that originate in library internals (the engine's own retry jitter, provider SDKs): the retry jitter uses a natively captured `Math.random`, and the in-process guard skips callers that live under `node_modules`.
  - `rulvar run --profile` now applies the profile's per-role effort hints: entries in `defaults.routing` that carry no effort are seeded from `RunProfile.effortByRole` (an explicit host effort always wins; ladder entries and unrouted roles stay untouched).
  - `rulvar --help` documents the shipped `kb inbox` and `kb gate` subcommands.
  - The unscoped `rulvar` pointer package ships TypeScript declarations (`index.d.ts` with a `types` export condition), so strict TypeScript projects can import the bare name; the install smoke gate now packs and checks the pointer alongside the umbrella.

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

## 1.0.0

### Minor Changes

- 807d1f9: M9-T04 (final part): the DEF-4 live re-record, production-journal replay, and the one-CI-job catalog gate (docs/09 section 6; docs/10 M9 row "Complete catalog green in one CI run"; the 1.0 gate of docs/12 section 5).

  - The six DEF-4 cassettes are re-recorded through the LIVE producers per the synthetic-fixture rule: engine runs, RunHandle.resolveExternal, and the offline kernel writer (the M8 machinery) produce the committed journals; recordLiveCassettes gains the six recorders and scripts/record-m3-cassettes.mjs regenerates them. The synthetic builders stay in the suite as the kernel regression (def1-def4.test.ts now replays the builder output for DEF-4), and the new def4-live.test.ts replays the committed live forms end-to-end, seq-agnostic.
  - Production-journal replay is wired: dogfood journals live under the frozen `journals/` directory and every one replays STRICT with zero live calls against its shipped workflow (examples/src/journals.test.ts; RECORD_DOGFOOD=1 re-records). Seeded with judge-panel-fake, a full run of the shipped judge-panel example.
  - The catalog gates as ONE CI job: `cassette-catalog` runs scripts/catalog-audit.mjs (every docs/09 section 6 ID must resolve to a cassettes/ fixture or a named suite; 58 IDs today, parser-drift guarded) and then a single vitest invocation over every cassette suite (the M2/M3/M9 fixture suites, the M7/M8/M9 plan cassettes, the M8 multi-process soak, and the dogfood journals), replay-strict with zero live calls.

### Patch Changes

- Updated dependencies [0e0b569]
- Updated dependencies [b28b7a3]
- Updated dependencies [b53a89e]
- Updated dependencies [4454175]
- Updated dependencies [6599ca8]
- Updated dependencies [6649e5f]
- Updated dependencies [fd2f83b]
- Updated dependencies [01d6b2d]
- Updated dependencies [9a20dbb]
- Updated dependencies [0fbe7ea]
- Updated dependencies [ebe0abc]
- Updated dependencies [a3079d0]
- Updated dependencies [596a39b]
- Updated dependencies [464ab6e]
  - @rulvar/core@1.0.0

## 0.9.0

### Minor Changes

- 65c7b2c: M8-T01: createServer, the HTTP shell (docs/02 section 8.2; FR-702), plus the Engine.stores seam it stands on (docs/06 10.2, M8 entry amendment).

  - `@rulvar/cli`: `createServer({ engine, workflows })` returns `{ fetch(req: Request): Promise<Response> }` with the five canonical routes: POST /runs (start a registered workflow), GET /runs/:id (status and outcome), GET /runs/:id/events (SSE; Last-Event-ID maps to the event seq, replay is at-least-once and consumers deduplicate on `replayed`), POST /runs/:id/external/:key (programmatic resolution, `by: 'external'`; a run that settled suspended in-process auto-resumes; a run not live in this process gets the documented offline append under a lease where the store is leasable, and resumes on a worker), GET /runs/:id/cost (the settled in-process CostReport, or the pure journal fold priced by the optional `priceUsd`). Authentication stays host middleware (docs/14, OQ-16).
  - `@rulvar/core`: the Engine interface gains the readonly `stores` accessor exposing the configured journal and transcript stores; exactly the instances createEngine received (or defaulted), no store contract widens.
  - `@rulvar/testing`: `createTestEngine` forwards the new `stores` accessor.

- ebc8101: M8-T04: the redaction and retention interim rules executed (docs/14 OQ-20 and OQ-22; docs/09 section 8 rewritten to the executed state; docs/03 12.4 and 12.8; docs/06 10.1 and 10.2 amendments).

  - `@rulvar/core`: the L0 SerializationHook (`createEngine({ serialization })`): redact/encrypt at the append/put boundaries, symmetric on load/get, applied by wrapping the stores so `Engine.stores` exposes the one policy point; kernel ordering fields are drift-checked with a loud ConfigError. Default key masking at the telemetry boundary: every emitted WorkflowEvent passes `maskSecrets` (provider keys, PATs, bearer tokens, JWTs, private-key blocks become `[masked-secret]`); opt out via `redaction: { maskEvents: false }`; never touches the journal. Retention: `TranscriptStore.delete(ref)` joins the SPI (missing ref is a no-op; InMemory and File stores implement it), `Engine.deleteRun(runId)` cascades blob deletion before the journal (no orphan transcripts), and `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that nothing else references (parked, cancelled, escalated, and hanging attempts keep theirs).
  - `@rulvar/cli`: `createServer` and `createWorker` take the opt-in `retention` predicate over RunMeta (the server applies it at terminal settles, the worker during sweeps under a brief lease); the OTel exporter masks string span attributes with the same policy, defense in depth over the already conservative attribute content policy.
  - `@rulvar/testing`: `createTestEngine` forwards `deleteRun`/`pruneRun`.

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [85d55cf]
- Updated dependencies [b88c9e3]
- Updated dependencies [f3c4613]
- Updated dependencies [a41c20f]
- Updated dependencies [f4e70be]
- Updated dependencies [75d1646]
- Updated dependencies [0627413]
- Updated dependencies [55c0f87]
- Updated dependencies [fd33871]
- Updated dependencies [e70e7f4]
- Updated dependencies [bc9c903]
  - @rulvar/core@0.8.0

## 0.7.0

### Minor Changes

- 10b45f1: M6-T11: the rulvar plan command and the M6 gating cassettes. `rulvar plan "<goal>" [--dry-run]` (the canonical grammar) loads @rulvar/planner DYNAMICALLY (the CLI's static dependency stays @rulvar/core; a missing install is a clear error), plans against the host-config engine, prints the accepted script plus its advisory diagnostics, and runs it in the worker sandbox unless --dry-run. The three docs/09 6.10 gating cassettes are recorded on the FakeAdapter and committed under the frozen-fixture lock with exported scenario builders shared by the recorder script and the replay tests: sandbox-determinism (two fresh runs of one CompiledWorkflow produce byte-identical normalized journals matching the cassette), planner-self-repair (the failing draft round-trips through the JSON-diagnostics repair, re-planning from the committed journal is free, and the accepted script executes deterministically in the sandbox), and orchestrator-crash-resume (the committed pre-crash journal plus boundary checkpoints resume with zero re-paid spawns, no duplicate spawn decisions, and byte-stable handles).

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Minor Changes

- 638d9a1: M5-T04 VCR cassettes and cron contract tests. `@rulvar/testing` gains
  the tier-2 VCR at the adapter boundary: `record({ adapters, cassette,
redact? })` wraps live adapters and appends redacted JSONL rows keyed by
  a hash of the canonical wire-contract request (the engine-populated
  providerOptions.rulvar telemetry namespace is excluded from the key);
  `replay({ cassette, onMiss })` serves recorded streams back with the
  typed VcrMissError under 'throw' (hermetic CI) or live forwarding under
  'passthrough'. Redaction happens at record time: the built-in policy
  masks authorization material (key-shaped strings, bearer tokens,
  api-key assignments) in every stored string and a custom hook composes
  on top, so secrets never reach cassette bytes. Cassette headers record
  the hashVersion they were produced under (DEF-6), and replay adapters
  expose the recorded caps snapshots. The live contract-test cron
  workflow is now real: weekly, non-blocking, gated on the
  CONTRACT_TESTS_ENABLED variable and provider keys, validating the wire
  contract (one terminal event, Usage invariant, finish vocabulary)
  against committed provider cassettes and opening a contract-drift issue
  on failure instead of rerecording.

### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

## 0.5.0

### Minor Changes

- ac274f4: M4-T01 role protocol completion. The full trigger protocol for the six
  invocation roles lands in `@rulvar/core` (`model/roles.ts`):

  - Extract necessity is completed per docs/04 section 8.3: a separate
    final structured-output invocation fires when a schema is set AND
    (routing directs extract to a different model OR the loop model's
    required tier cannot ride a tools-available turn OR finalize is
    routed). The required-tier rule is new: a `forced-tool` tier pins
    toolChoice to `emit_result` and cannot ride while the agent's tools
    must remain available, so such agents now pay one separate extract
    call instead of silently losing tool access. Agents without tools
    keep the M1 single-shot behavior byte for byte.
  - The finalize role fires for the first time: only when configured in
    routing and only for tool-bearing agents, as one synthesis invocation
    with toolChoice `'none'` over the full transcript after tools stop.
    Its text is the output for schema-less calls; with a schema the
    separate extract runs over the transcript including the synthesis.
  - A separate extract invocation over a tool-bearing transcript now
    carries the agent's tool contracts (both providers reject tool-use
    history without tool definitions) with toolChoice pinned to `'none'`
    or to `emit_result` per tier.
  - Both adapters map `toolChoice: 'none'` to the provider's explicit
    none choice with the tools param present instead of dropping tools
    from the request.
  - `createTestEngine` no longer routes `finalize` by default: the
    routing key is the firing opt-in, and the old default would have
    summoned a synthesis call for every tool-bearing test agent. Tests
    that want finalize route it explicitly.

  Identity is untouched: extract and finalize resolutions never enter
  the spawn content key, and existing journals replay unchanged.

- b840aba: M4-T08 canonical effort completion and M4-T09 role quality floors.

  - Effort semantics are complete: the role effort defaults and the
    per-adapter mapping tables (Anthropic passthrough including max,
    OpenAI max downmapped to xhigh and recorded in providerMetadata,
    provider none only via namespaced providerOptions) shipped earlier
    milestones; this change completes VISIBLE scrubbing everywhere it was
    still silent: the summarize invocation surfaces its scrubs at fire
    time and a failover takeover surfaces the fallback's scrubs the
    moment it starts serving. Scrubbed effort is never mapped into
    max_tokens.
  - The effort-defaults-shift cassette is now RECORDED through the live
    runtime (docs/10 M4 gating row): the frozen v1 prefix, closed offline
    the way an operator would, resumes live under explicit high effort
    with the completed semantics; every v1 entry matches and the one new
    spawn carries canonical effort in v2 identity. The recorder output is
    pinned byte-for-byte by the frozen-drift suite and the fixture lock
    now covers 18 files.
  - Quality floors (`model/floors.ts`, M4-T09): per-role and
    per-declared-taskClass allow/deny lists supplied via
    `createEngine({ floors })`, enforced INSIDE the router at resolution,
    before any live call and before any journal entry, for every
    invocation the chain produces (primaries, failover fallbacks, and the
    summarize fallback alike). `AgentProfile.taskClass` declares the
    class; unclassified profiles see only byRole floors. A violation is a
    typed ConfigError.
  - The umbrella `rulvar` package now ships floors opinions next to its
    strong routing defaults: `recommendedDefaults.floors` pins orchestrate
    and plan to strong named models. The core itself ships no named model
    strings, and the umbrella suite enforces that with a source scan.

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

## 0.4.0

### Minor Changes

- dfe03b5: M3-T11 gating cassettes and the v0.4.0 BREAKING release notes.

  BREAKING (pre-1.0 convention, docs/12): `AgentStatus` now produces
  `'escalated'` at runtime and `AgentResult` carries the optional
  `escalation: EscalationReport` field (present if and only if the status
  is escalated). This is the third kernel amendment of the replay
  predicate (escalated-replays-as-ok, DEF-1) whose table row shipped
  frozen in M2; the producers ship here. Migration: add an `escalated`
  branch to every switch over `AgentStatus`; consumers not adopting the
  protocol are advised to map `escalated` to `limit` (paid partial work,
  output null, the report stays available for logs). `isEscalated` and
  `EscalatedResult` are exported for narrowing. Status production stays
  gated by opt-in: workflows that never pass `escalation` options cannot
  observe the new status at runtime.

  Cassettes: the DEF-1 live set (escalate-replay,
  crash-between-report-and-decision, flavor-b-timeout) is recorded through
  the live runtime and replayed strict; the M2 synthetic DEF-1 subset is
  re-recorded (memoize-classifier fully live; abandon-subtree through the
  kernel write APIs with a realistic escalated child report and an
  authorizing owner cancel decision; both re-record again with the
  orchestrator producers in M7). FakeAdapter gains fakeToolCalls and
  fakeWireError responder markers; replayRun gains the onEscalation
  pass-through so replay tests can prove the hook stays cold. The
  deliberate fixture regeneration updates fixtures.sha256 in the same
  change (the identity profile is UNCHANGED; this is the docs/10 M3-T11
  ordered re-record, not an identity-pipeline revision).

### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

## 0.3.0

### Minor Changes

- 43444f6: M2-T11/T12: the executable store conformance kit and the M2 gating
  cassettes with frozen fixtures.

  @rulvar/store-conformance ships its first real API: journalStoreConformance
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

  @rulvar/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
  abandon-covered hanging dispatch derives skipped instead of redispatching,
  abandon-covered operations contribute a zero ledger increment, the resume
  report lists covered entries as skipped (never orphaned), and an abandon
  over an already-resolved suspension folds to a noop with already_resolved
  (first-closing-wins per target, both closer kinds).

  @rulvar/testing ships the M2 cassette suite over committed frozen
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
  zero live calls), and @rulvar/testing replayRun (tier 3: strict replay
  of any journal with JournalMissError on ANY live call; suspended
  journals finish suspended with zero live calls).

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

## 0.2.0

### Minor Changes

- 5c4fc32: M1-T14/T15: @rulvar/testing tier 1 (FakeAdapter matching on
  agentType/label/prompt regex with a '*' fallback, honoring the selected
  structured-output tier, zero USD by construction; createTestEngine over
  the full real engine with recorded event streams; toHaveCalledAgent and
  toStayUnderBudget matchers at '@rulvar/testing/matchers') and the
  completed umbrella (re-exports of @rulvar/core and both first-class
  adapters, renderProgress, the umbrella-only recommendedDefaults strong
  model slots, the M1 exit-criteria example workflow, and the CI install
  smoke on packed tarballs). The core now populates the reserved
  providerOptions 'rulvar' telemetry namespace on every request (docs/04
  section 1.8 as amended) and AgentResult carries errorMessage detail for
  journaled WireError fidelity.

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

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

### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
