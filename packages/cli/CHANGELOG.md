# @rulvar/cli

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

### Minor Changes

- 969974f: rulvar kb inbox (M12-T03): aggregates kb_propose-born proposals from finished runs through the RunLedger fold behind the LedgerExport seam. Matching (subject, taskClass, polarity) triples group for display ONLY (the command writes nothing, authorizes no spend and schedules no sweeps); each proposal renders with full provenance (initiating run identity, proposal entryRef, lineage, tier, trigger, evidence refs) plus the typed template statement a gated claim would carry; proposals of runs finished more than fourteen days ago expire out of the view. This is the human review surface, so the quarantined note and concrete model names render here verbatim, exactly like kb list.
- 64aff88: rulvar kb gate (M12-T04, the closing task of ModelKnowledge phase 3): the human gate flow turning one inbox proposal into a human-editorial claim. The attribution attestation is mandatory by construction (without --ruled-out over the closed checklist the GateRecord does not assemble and nothing is written; contrast evidence rides --contrast-run or --contrast-eval); the born claim carries the typed template statement (never the quarantined note), origin provenance back to the proposing run and entry, evidence resolving into that run's journal, and the editorial TTL. The commit is CAS against the per-project rulvar.models.json, whose git review is the authenticating gate. Non-proposal entries, expired proposals (fourteen days from the run's terminal updatedAt), running runs and already-gated proposals reject with typed errors.

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

- 93eae2c: M10-T04: `rulvar kb list` (docs/05, section "Read path"; docs/06, section 10.5). The second consumption path: claims of the per-project store (./rulvar.models.json) render with full provenance for the humans who author ladders, floors, and profiles: author and gate identity, evidence refs (journal seqs and eval reports), metrics when present, supersede chains, proposal origin, and the TTL state (holds or EXPIRED) per the docs/05 decay table. No run and no pin are involved, so the maintenance view names models verbatim; only in-run cards are nameless. The grammar members `kb inbox` (phase 3, M12) and `kb sweep` (phase 2, M11) fail loudly naming their phases until they ship.
- fef6263: M11-T05: `rulvar kb sweep` (docs/05, section "Grounding and decay"). Falsification sweeps run manually, from CI, or from a user cron, never engine-scheduled, configured by the `kbSweep` section of rulvar.config.mjs (committerId, the FIXED model pool, taskClass-tagged eval cases, optional thresholds and canary probes; @rulvar/evals loads dynamically like @rulvar/planner does for plan).

  - The falsification guarantee: the matrix is the configured pool UNIONED with every model carrying an active, unexpired negative claim, plus the re-measurement queue (expired active eval claims); the pool renders with each member's origin.
  - With canary probes configured, every pool member fingerprints BEFORE measurement and drift flips its eval claims to stale in place; the sweep then re-measures and commits threshold-crossing claims through the eval-committer identity, reporting cells, emitted claims, and the committed store version.

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

- a2a3243: M8-T02: createWorker, the queue shell (docs/02 section 8.3; FR-703), plus the two queue seams it stands on (docs/06 10.2 and docs/03 12.3, M8 entry amendment).

  - `@rulvar/cli`: `createWorker(engine, { store: LeasableStore, concurrency? })` leases resumable and suspended runs via acquire/renew/release with fencing epochs (renew cadence ttl/3; Appendix A reference ttl 60000 ms; concurrency default 1). A store without lease capability is a typed ConfigError at start, never a silent split-brain; leasing a store other than `engine.stores.journal` is equally a ConfigError. DEF-6 repeats at acquire: a journal outside the hashVersion window releases the lease and poisons the run for this worker. Stateless workers call bare `engine.resume` with the lease; unchanged suspended runs are skipped until their journal grows; queue semantics stay honestly at-least-once with deduplication by the journal. The OQ-21 residual (original in-process args are not journaled) is bridged by the optional `argsFor` hook.
  - `@rulvar/core`: `ResumeOptions.lease` carries the worker's lease through the kernel's single append site, so a stale writer's appends are rejected by the fencing epoch and never become visible (lease theft impossible by construction); bare `engine.resume(runId)` now falls back from the persisted CompiledWorkflow source to `defaults.workflows[workflowName]` (the registry the queue worker resolves through, docs/06 10.4); the Replayer accepts the lease option.

- f920013: M8-T03: the multi-process seam soak and the queue-failover-during-forced-finish cassette (the DEF-7 final cassette; docs/09 sections 6.9 and 6.10; docs/10 section 3.9 exit criteria).

  - `@rulvar/plan`: the public `runQueueFailoverDuringForcedFinish` cassette runner: worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, finalization is paid once. The LeasableStore is injected (`QueueFailoverDeps.makeStore`) so the package stays core-only; the replay test and the record script supply the reference SqliteStore.
  - `@rulvar/cli`: the multi-process-fencing-soak harness: two workers over one SqliteStore file with kill/failover across the suspension, plan-revision, and forced-finish boundaries; every round asserts zero split-brain and zero double pay. Worker hardening: a failed renew now frees the concurrency slot immediately (a stale run whose landings all reject may never settle; fencing, not the stale process's cooperation, protects the journal).
  - Repo: `cassettes/queue-failover-during-forced-finish.json` recorded and frozen (double-run agreement; `scripts/record-m8-cassettes.mjs`); the queue-mode limitation stays documented (no distributed cross-process rate limiter, EXC-14/OQ-17).

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

- 9f000a7: Drop the @rulvar/planner peer declaration from the CLI: the plan command loads the planner DYNAMICALLY and reports a clear error when it is not installed, and a workspace peer dependency would major-cascade the whole fixed group on every planner bump under the changesets peer-dependents rule (0.6.0 would have released as 1.0.0 instead of 0.7.0).
- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Minor Changes

- fa05007: M5-T01 workflow registry and the @rulvar/cli base.

  - `@rulvar/core` gains the per-engine `WorkflowRegistry` type and
    `defaults.workflows` on createEngine (docs/06 section 10.4): an
    explicit first-class value, no module-level registry; shells resolve
    by-name runs against it (ctx.workflow's string form arrives M6, the
    queue worker M8).
  - Spec-conformance fix: the M4-T09 quality floors option moves from the
    createEngine top level to its canonical home `defaults.roleFloors`
    (docs/06 section 10.1). Update `createEngine({ floors })` call sites
    to `createEngine({ defaults: { roleFloors } })`.
  - `@rulvar/cli` ships its first real surface: the canonical grammar
    `rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]`,
    `rulvar resume <runId> [--args JSON] [--store PATH]`,
    `rulvar runs ls [--store PATH]`, `rulvar inspect <runId> [--store
PATH]` (no aliases), a line-oriented TUI progress renderer over the
    event stream, and interactive resolution of suspended approvals and
    externals (EOF leaves the run suspended, never errors). Engine
    assembly follows the host-config convention: `rulvar.config.mjs`
    default-exports `{ engineOptions?, workflows? }`, a workflow module
    may export `workflow`/`engineOptions`/`workflows`, and --store selects
    the JsonlFileStore directory (default `.rulvar`), so the CLI itself
    depends only on @rulvar/core. The `rulvar` bin is included; the
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
  Unpriced models keep surfacing, never as silent zeros. `rulvar inspect`
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
    keyed on profile names. `rulvar run --profile <name>` applies the
    chosen profile UNDER the host's own engine options (host always wins;
    the engine then sees only ordinary options), compiling the profile's
    permission preset into the engine deny/ask layers as data.
  - `@rulvar/cli` gains `toOtel(run, tracer)`: it maps a settled run's
    spanId tree 1:1 onto OpenTelemetry spans (run > phase > agent > tool >
    child), with rulvar.* and gen_ai.* attributes, start/end timestamps
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
  - @rulvar/core@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

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
  - @rulvar/core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

## 0.2.0

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
