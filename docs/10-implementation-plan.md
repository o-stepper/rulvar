# Implementation plan

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: The milestone-by-milestone, task-by-task build plan for lurker: an implementer (human or LLM) MUST be able to build the entire project from this file plus the spec docs it cites, with no other inputs.

---

## 1 Planning rules

### 1.1 Authority and scope

This document owns the milestone registry (M0..M12) and the task registry (Mx-Tyy). Requirements are owned by [docs/01-requirements.md](01-requirements.md) (section "FR registry"); tasks cite requirements by hundred-block (FR-0xx .. FR-7xx) and by NFR theme, never by restating requirement text. Normative behavior lives in the spec docs (docs/03 through docs/09); tasks cite the owning spec section for every behavior they implement. The toolchain is committed in [docs/13-toolchain-repo.md](13-toolchain-repo.md) (section "Committed toolchain"). Release mechanics are in [docs/12-release-versioning.md](12-release-versioning.md).

Spec amendment precedes code: any deviation from a cited spec section discovered during implementation MUST be resolved by a docs amendment PR before the deviating code merges (see docs/README.md, section "Docs versioning and amendment process").

### 1.2 Task ID scheme

- Task IDs are `Mx-Tyy` with `yy` two-digit zero-padded (example: M2-T06), allocated in dependency order within the milestone.
- Task IDs are unique and never reused. A task moved between milestones gets a new ID in the destination milestone with a cross-note at both IDs.
- `DEF-1`..`DEF-8` markers tie tasks to the eight defect-fix mechanisms folded into the specs; `XF-01`..`XF-12` mark cross-review amendments; `EXC-nn` are the not-in-v1 exclusions ([docs/01-requirements.md](01-requirements.md), section "EXC registry"); `OQ-nn` are open questions ([docs/14-open-questions.md](14-open-questions.md)).

### 1.3 Task record format

Every task record carries these fields:

- **Package**: owning package(s); the proposed module layout names concrete files under `packages/<name>/src/`.
- **Build**: what to construct (types, functions, files).
- **Inputs**: spec doc sections and FR/NFR/DEF traceability.
- **Deliverables**: exported symbols and files.
- **Acceptance**: behavioral, checkable criteria.
- **Tests**: required test tiers (unit, property, cassette, replay-strict, conformance, contract), per [docs/11-testing-strategy.md](11-testing-strategy.md).
- **Depends on**: task IDs that MUST be complete first.

### 1.4 Ordering rules (normative)

1. Milestones map 1:1 to lockstep versions. Every milestone completes with exactly one release in which all published `@lurker/*` packages plus the umbrella carry the identical version (`@lurker/compat` is the sole exemption; see [docs/12-release-versioning.md](12-release-versioning.md), section "Exemptions"). "The umbrella" means the package name resolved by the M0-T07 naming checklist; while the unscoped name `lurker` remains contingent, the umbrella publishes as `@lurker/lurker` and this rule reads that scoped package as the umbrella ([docs/13-toolchain-repo.md](13-toolchain-repo.md), section "Naming risk note"; risk R7).
2. **DEF-1 ordering rule.** All three kernel amendments and the full replay predicate table (`replayDisposition`, including the alias column) land in M2, the Journal Kernel milestone, strictly BEFORE any Agent Runtime depth work in M3. The predicate MUST NOT be split across layers or milestones.
3. **hashVersion freeze discipline.** The hashVersion 2 profile (identity derivation, scope grammar including `plan/NodeId`, kinds registry v2 including kinds whose producers ship later, status vocabulary including `escalated`, disposition table, fold defaults) is frozen in M2 with golden fixtures. Later milestones add producers of already-registered kinds; they MUST NOT alter identity. Any post-M2 identity change requires a hashVersion 3 bump under the release discipline in [docs/12-release-versioning.md](12-release-versioning.md), section "hashVersion release discipline" (DEF-6).
4. Pre-1.0 breaking changes ride MINOR releases flagged BREAKING in the changelog. The planned breaking minors are M3/v0.4.0 (`AgentStatus` gains `'escalated'`, DEF-1) and M7/v0.8.0 (the AdmitVerdict widening, the reuse-by-reference default, the `maxEscalationsPerLogicalTask` rename, and the plan-surface changes of DEF-2/DEF-8). The authoritative registry of planned BREAKING minors is [docs/12-release-versioning.md](12-release-versioning.md), section "Pre-1.0 convention"; the milestone map below and that table MUST stay identical.
5. Every milestone exits with its gating cassette set green under replay-strict CI (zero live calls; `JournalMissError` on any miss). The cassette catalog is owned by [docs/09-observability-testing-spec.md](09-observability-testing-spec.md), section "Mandatory defect cassette catalog"; the suite-to-milestone gate matrix is in [docs/11-testing-strategy.md](11-testing-strategy.md), section "Per-milestone exit criteria matrix".
6. A package stays `"private": true` in the workspace until the milestone where its first tasks complete; from its first publish onward it releases in lockstep. Placeholder publishes at M0 exist only to secure names (see M0-T07).
7. No task may implement anything on the EXC list (section 6). A PR that smuggles excluded scope is rejected regardless of quality.

### 1.5 Definition of done (global)

A task is done when: (a) code merged on the committed toolchain with `tsc --noEmit` clean and ESLint clean; (b) all required tests green in CI (`vitest run` across projects); (c) publint and @arethetypeswrong/cli pass on the packed tarball of every touched package; (d) the docs delta (if the task changed any normative surface) merged first; (e) a changeset exists, with a BREAKING section when applicable; (f) new public API appears in the committed rolled-up `.d.ts` diff and was reviewed.

A milestone is done when: all its tasks are done, its exit criteria hold, its gating cassettes are green under replay-strict, and the lockstep release (Version Packages PR flow, npm trusted publishing) is published.

## 2 Milestone-version table

| Milestone | Version | Name | Scope summary | Breaking |
|---|---|---|---|---|
| M0 | v0.1.0 | Repo bootstrap | Monorepo scaffold on the committed toolchain, L0 contracts skeleton, docs/ canon landed, naming checklist executed | no |
| M1 | v0.2.0 | Embeddable core | ctx primitives, two first-class adapters, structured-output tiers, event stream, InMemoryStore, FakeAdapter | no |
| M2 | v0.3.0 | Durability (Journal Kernel) | JsonlFileStore, forward-matching, full replay predicate with three kernel amendments, ref-entries, hashVersion, conformance kit (DEF-1/4/6) | no |
| M3 | v0.4.0 | Agent depth | Tool system, MCP, permission chain, checkpoints, worktree isolation, terminal `escalated` status | yes (BREAKING minor) |
| M4 | v0.5.0 | Model layer completion | Roles, HistoryProjector, failover, price table, canonical effort completion, RetryPolicy, floors | no |
| M5 | v0.6.0 | Ops ergonomics | @lurker/cli, @lurker/store-sqlite, VCR cassettes, permission presets, examples corpus | no |
| M6 | v0.7.0 | Flagship hybrid + mode (c) substrate | @lurker/planner, sandbox, eslint-plugin-lurker, dynamic orchestrator, AdmissionController, WakeDigest substrate | no |
| M7 | v0.8.0 | Adaptive orchestration full | @lurker/plan: PlanRunner, rebase, RunLedger, ModelLadder, termination, lineage, reuse, orchestrator cap (DEF-2/3/5/7/8) | yes (BREAKING minor) |
| M8 | v0.9.0 | Server and queue | createServer, createWorker, leasing/fencing soak | no |
| M9 | v1.0.0 | Ecosystem and freeze | @lurker/bridge-ai-sdk, @lurker/evals, full cassette set, SPI freeze, release gates | no |
| M10 | v1.1.0 | ModelKnowledge phase 1 | ModelKnowledgeStore SPI, file store, editorial claims, kb_pinned/kb_repinned, card | no |
| M11 | v1.2.0 | ModelKnowledge phase 2 | eval-measured claims, matrix sweeps, TTL/staleness, canary, kb sweep | no |
| M12 | unassigned | ModelKnowledge phase 3 (gated) | kb_propose, modelObservations, inbox, human gate; only after the measured-value checkpoint | no |

Runtime startTier promotion and the eval-confirmed auto-gate remain v2 candidates outside this map (EXC pointers, section 6).

### 2.1 Gating cassette sets per milestone

Cassette names are test IDs from [docs/09-observability-testing-spec.md](09-observability-testing-spec.md), section "Mandatory defect cassette catalog" (including its M6/M8 substrate and soak set).

**Synthetic-fixture rule (normative).** A cassette whose live producers ship in a milestone LATER than its gating milestone gates as a synthetic fixture: its journal entries are hand-authored against the kinds registry v2 and payload schemas frozen in M2 (rule 1.4.3) and replayed through the kernel via `replayRun` with a stub workflow; no live producer is required. The same cassette ID is re-recorded through the live producers in the milestone that ships them, and both forms stay in the suite (the synthetic form as a kernel regression, the live form as the end-to-end gate). The table below marks every synthetic gating entry and its re-recording milestone; the catalog in docs/09 carries the same rule.

| Milestone | Gating cassettes |
|---|---|
| M2 | DEF-4 set as synthetic fixtures (timeout-vs-live-race, class-decision-fanout, abandon-then-crash-then-resume, abandon-vs-resolution-race, offline-invalid-then-valid, double-abandon-idempotent; the escalate/EscalationDecision entries and the plan.revision cancel_task entries are hand-authored because their producers ship in M3-T07 and M7-T04/M7-T11; re-recorded live in M7); DEF-6 set (resume-v1-on-engine-v2, resume-v1-with-inserted-call, suspended-v1-resolves-on-v2, reject-version-too-old, reject-version-from-future; effort-defaults-shift as a synthetic fixture until role effort defaults ship in M4-T08); DEF-1 synthetic-fixture subset (abandon-subtree, memoize-classifier, v1-journal-on-v2) |
| M3 | DEF-1 live set (escalate-replay, crash-between-report-and-decision, flavor-b-timeout) plus the re-recorded M2 DEF-1 subset |
| M4 | effort-defaults-shift re-recorded and re-validated with full effort semantics (M4-T08) |
| M6 | sandbox-determinism; planner-self-repair; orchestrator-crash-resume (mode (c) resume; docs/09 M6/M8 substrate and soak set) |
| M7 | DEF-2 set; DEF-3 set; DEF-5 set; DEF-8 set; DEF-7 set minus queue-failover-during-forced-finish; round-2 set (revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung); DEF-4 set re-recorded through the live producers |
| M8 | queue-failover-during-forced-finish; multi-process-fencing-soak (docs/09 M6/M8 substrate and soak set) |
| M9 | Complete catalog green in one CI run |

## 3 Per-milestone task breakdowns

### 3.1 M0, v0.1.0: repo bootstrap

Goal: a releasable monorepo on the committed toolchain with the docs canon landed and every name-related external dependency attempted or recorded.

Entry criteria: docs/ set approved; founder decisions recorded (naming, License: TBD, lockstep).

Exit criteria: CI green on an empty-but-building workspace (all 14 package scaffolds compile); publint/attw pass on packed placeholder tarballs; v0.1.0 released via the trusted-publishing pipeline for the placeholder-published packages; naming checklist outcomes recorded in docs/13.

Packages touched: all 14 scaffolds (`@lurker/core`, `@lurker/plan`, `@lurker/planner`, `@lurker/anthropic`, `@lurker/openai`, `@lurker/store-sqlite`, `@lurker/store-conformance`, `@lurker/compat`, `@lurker/testing`, `@lurker/evals`, `@lurker/cli`, `@lurker/bridge-ai-sdk`, `eslint-plugin-lurker`, umbrella `lurker`), repo root.

#### M0-T01 Monorepo scaffold

- Package: repo root, all package directories.
- Build: `pnpm-workspace.yaml` with `packages/*` globs and catalogs for shared external versions; `packageManager` pinned to an exact pnpm 11.x version per the selection rule in docs/13 section "Package manager: pnpm 11.x workspaces"; 14 package directories with the package.json template ([docs/13-toolchain-repo.md](13-toolchain-repo.md), section "package.json template per package"): `type: module`, `engines >=22.12.0`, exports map types-then-default plus `./package.json`, `files: ["dist"]`, `sideEffects: false`, `workspace:*` internals, License: TBD placeholder; all packages `"private": true` initially.
- Inputs: docs/13 sections "Committed toolchain", "Repo layout"; NFR embeddability block (docs/01).
- Deliverables: workspace files; `packages/<name>/package.json` for all 14; empty `src/index.ts` per package.
- Acceptance: `pnpm install --frozen-lockfile` succeeds; `pnpm -r run build` builds all scaffolds topologically.
- Tests: none beyond CI build.
- Depends on: none.

#### M0-T02 TypeScript and build configuration

- Package: repo root, all packages.
- Build: base `tsconfig.json` (module/moduleResolution nodenext, target es2023, strict, verbatimModuleSyntax, isolatedDeclarations, erasableSyntaxOnly) and per-package extends; tsdown config template producing ESM plus rolled-up `.d.ts`; `tsc --noEmit` typecheck script; repo rule lint: no top-level await in package entry modules; explicit `.js` extensions in relative imports.
- Inputs: docs/13 sections "Committed toolchain", "tsconfig template".
- Deliverables: `tsconfig.base.json`, `packages/*/tsconfig.json`, `packages/*/tsdown.config.ts`.
- Acceptance: a sample exported type in @lurker/core round-trips through build and is consumable from a scratch Node 22.12 project via `require()` and `import`.
- Tests: CI build; attw on the sample tarball.
- Depends on: M0-T01.

#### M0-T03 Lint and format

- Package: repo root.
- Build: root `eslint.config.js` (flat) with typescript-eslint v8, `projectService: true`, recommendedTypeChecked; Prettier config; format check in CI.
- Inputs: docs/13 section "Committed toolchain".
- Deliverables: `eslint.config.js`, `.prettierrc`.
- Acceptance: `pnpm lint` and `pnpm format:check` pass repo-wide.
- Tests: CI job.
- Depends on: M0-T01.

#### M0-T04 Test infrastructure

- Package: repo root.
- Build: single root `vitest.config.ts` with `test.projects` over `packages/*`; one `vitest run` covers everything.
- Inputs: docs/13 section "Committed toolchain"; docs/11 section "Pyramid and tooling".
- Deliverables: `vitest.config.ts`; one smoke test per package.
- Acceptance: `pnpm test` runs all projects in one invocation.
- Tests: the smoke tests themselves.
- Depends on: M0-T01.

#### M0-T05 CI pipeline

- Package: repo root (`.github/workflows/`).
- Build: GitHub Actions: pnpm/action-setup plus setup-node with pnpm cache; Turborepo 2.x orchestration (`build` dependsOn `^build`; documented `pnpm -r run` fallback); test matrix node 22.x and 24.x, 26.x optional non-blocking; publint and @arethetypeswrong/cli on packed tarballs as required gates; typecheck and lint jobs.
- Inputs: docs/13 sections "Committed toolchain", "Repo layout" (CI workflow spec).
- Deliverables: `.github/workflows/ci.yml`, `turbo.json`.
- Acceptance: CI green on a PR touching every package; cache hit on unchanged packages.
- Tests: the pipeline itself.
- Depends on: M0-T02, M0-T03, M0-T04.

#### M0-T06 Release infrastructure

- Package: repo root.
- Build: @changesets/cli 2.x in fixed mode; the fixed group enumerates the thirteen lockstep packages explicitly by name (every workspace package except `@lurker/compat`; no globs, no negation patterns); a CI repo check asserts the fixed list equals workspace packages minus `@lurker/compat`; changesets/action Version Packages PR flow; release workflow with `permissions: id-token: write`, npm trusted publishing (OIDC, automatic provenance), pinned known-good pnpm 11.x.
- Inputs: docs/12 sections "Lockstep policy", "Exemptions", "Release pipeline"; docs/13 risk register (pnpm OIDC regression).
- Deliverables: `.changeset/config.json`, `.github/workflows/release.yml`.
- Acceptance: a dry-run release produces identical versions for all fixed-group packages and correct `workspace:*` range conversion at pack time.
- Tests: release dry-run in CI.
- Depends on: M0-T05.

#### M0-T07 Naming checklist (explicit)

- Package: none (external actions plus docs).
- Build: execute and record: (a) npm org/scope claim attempt for `@lurker`; (b) GitHub org variant selection (`lurker` is unavailable; pick among lurker-dev, lurkerjs, getlurker); (c) one trusted-publisher entry per package on npmjs.com (all 14 plus umbrella when publishable); (d) placeholder publish of `@lurker/core` (and other scoped names as capacity allows) at v0.1.0 to secure names; (e) record the unscoped `lurker` contingency status (squatted 2014 GPLv3 package; dispute, transfer, or fallback lurkerjs / lurker-ai / `@lurker/lurker`).
- Inputs: docs/13 section "Naming risk note"; docs/12 section "The 1.0 gate".
- Deliverables: updated "Naming risk note" in docs/13 with outcomes; trusted-publisher configs.
- Acceptance: every outcome recorded; no doc anywhere uses bare `lurker` in install commands.
- Tests: docs grep check in CI (install commands use `@lurker/<name>`).
- Depends on: M0-T06.

#### M0-T08 L0 contracts skeleton and vendored dependencies

- Package: `@lurker/core`.
- Build: module layout skeleton `src/l0/` with placeholder files: `messages.ts`, `errors.ts`, `schema.ts`, `entries.ts`, `events.ts`, `spi/provider.ts`, `spi/store.ts`, `spi/transcript.ts`, `spi/runner.ts`, `spi/toolsource.ts`, `spi/isolation.ts`, `spi/knowledge.ts`; vendored assets under `src/vendor/`: StandardSchemaV1 types (types only, never a runtime dep), eval-free JSON Schema validator subset (draft 2020-12 minus `$dynamicRef` and remote `$ref`, @cfworker/json-schema lineage), ULID with monotonic factory (vendored or zero-dep `ulid` 3.x).
- Inputs: docs/02 section "Layers"; docs/13 dependency baseline pins; docs/08 section "SchemaSpec" (validator subset).
- Deliverables: compiling skeleton exporting nothing public yet; vendor files with provenance comments.
- Acceptance: `@lurker/core` builds; vendored validator passes its ported test subset; ULID monotonic factory produces sorted ids within one millisecond.
- Tests: unit tests for vendored validator and ULID.
- Depends on: M0-T02.

#### M0-T09 Docs canon and contributor workflow landed

- Package: repo root (`docs/`).
- Build: commit the 16-file docs/ set as the single source of truth; contributor workflow (branching, commit conventions, changeset requirement, review gates) per docs/13 section "Contributor workflow"; CI doc checks (ASCII hyphen rule, no emojis, one H1).
- Inputs: docs/README.md (conventions, canon statement).
- Deliverables: `docs/*.md` in repo; `CONTRIBUTING.md`.
- Acceptance: doc lint passes; README reading order resolves (all cross-references point at existing files/sections).
- Tests: docs lint job.
- Depends on: M0-T01.

### 3.2 M1, v0.2.0: embeddable core

Goal: a typed multi-agent orchestrator embeddable in an existing application, unit-testable without network: ctx primitives, two first-class adapters on the July 2026 surfaces, structured output, events, in-memory persistence.

Entry criteria: M0 released; docs/03 identity sections, docs/04 wire chapter, docs/06 Ctx interface stable.

Exit criteria: an example workflow using `ctx.agent`/`parallel`/`pipeline` runs against FakeAdapter with zero network and against both live adapters manually; structured-output tiers verified against both providers; publint/attw green; v0.2.0 released. Packages first published: `@lurker/core`, `@lurker/anthropic`, `@lurker/openai`, `@lurker/testing`, and the umbrella. The umbrella publishes under the name the M0-T07 naming checklist resolved; if the unscoped `lurker` name is still contingent at M1, the umbrella publishes as `@lurker/lurker` per rule 1.4.1 (resolving the unscoped name later is a rename-or-alias release decision recorded in [docs/13-toolchain-repo.md](13-toolchain-repo.md), section "Naming risk note", and gated no later than M9-T06).

#### M1-T01 L0 wire contracts

- Package: `@lurker/core` (`src/l0/messages.ts`).
- Build: `Msg` (roles system|user|assistant|tool; ordered parts), the `Part` union including `provider-raw`, `ChatRequest`, the `ChatEvent` union (text-delta, tool-call start/delta/end, reasoning-delta, usage, finish with typed refusal outcome carrying provider stop details, error), `Usage` with its invariant (inputTokens is the full prompt including cache), `CanonicalId` as engine-minted ULID, `cacheHint` schema, providerOptions/providerMetadata namespacing rules; canonical `Effort` union type with five levels low|medium|high|xhigh|max (a string-literal union, never a TS enum: erasableSyntaxOnly forbids enums); the L0 aliases `JsonSchema` and `ToolContract`; the model-spec family declarations `ModelSpec`, `ModelChoice`, `CanonicalModelSpec`, `CanonicalLadderSpec` (docs/04 section "Router and resolution chain"; resolution semantics land in M1-T05).
- Inputs: docs/04 sections "Wire contract (L0)" and "Router and resolution chain"; FR-1xx.
- Deliverables: exported types listed above from `@lurker/core`.
- Acceptance: types compile under isolatedDeclarations; refusal is a typed finish outcome, never a null projection.
- Tests: type-level tests (expect-type); unit tests for CanonicalId minting.
- Depends on: M0-T08.

#### M1-T02 Error taxonomy

- Package: `@lurker/core` (`src/l0/errors.ts`).
- Build: `LurkerError` base with the closed string-code registry; `WireError` JSON-serializable projection `{ code, message, retryable, data? }`; the named error classes with layer/code/retryability/journaling metadata per the docs/02 table (AgentError, ConfigError, NonSerializableValueError, ScriptRejected, JournalCompatibilityError, InvalidResolutionError, JournalOrderViolation, PlanInvariantError, ReplayPlanHashMismatch, OrchestratorCapConfigError, JournalMissError, BudgetExhaustedError, LeaseHeldError; classes whose producers ship later are still defined now so the code registry is closed once).
- Inputs: docs/02 section "Error taxonomy"; FR-2xx.
- Deliverables: `LurkerError`, `WireError`, all named error classes, `ErrorCode` union.
- Acceptance: every named error serializes to a `WireError` and back losslessly for journal-bound fields.
- Tests: unit round-trip tests.
- Depends on: M0-T08.

#### M1-T03 SchemaSpec and Out inference

- Package: `@lurker/core` (`src/l0/schema.ts`).
- Build: `SchemaSpec` three forms (Standard Schema; `{ jsonSchema, validate }` pair; bare JSON Schema); `Out<S>` inference (Standard Schema output type; validate() type-guard target; unknown for bare JSON Schema); JSON Schema projection via StandardJSONSchemaV1 `'~standard'.jsonSchema.input()` targeting draft-2020-12 with draft-07 fallback, typed ConfigError at definition time when projection is unavailable; canonical schema derivation (JCS ordering, local `$ref` inlining, remote/dynamic `$ref` forbidden, annotation keywords stripped) feeding `schemaHash`.
- Inputs: docs/08 section "SchemaSpec"; docs/03 section "schemaHash/toolsetHash derivation"; FR-4xx, FR-0xx.
- Deliverables: `SchemaSpec`, `Out`, `projectToJsonSchema`, `canonicalizeSchema`.
- Acceptance: Zod 4.2+ and ArkType 2.1.28+ schemas project; Valibot 1.x accepts as form 1 (StandardSchemaV1) but, not implementing StandardJSONSchemaV1 as of 1.4, raises the documented definition-time ConfigError on projection (docs/08, section "JSON Schema derivation and acceptance rules") until it ships the converter; a transforming schema uses the input projection; remote `$ref` rejects with ConfigError. (Amended during M1-T03: the original line asserted Valibot 1.2+ projects, which is not factual for the released Valibot 1.x line.)
- Tests: unit tests per form; property test: canonicalization is idempotent and order-insensitive.
- Depends on: M1-T02.

#### M1-T04 Journal write path and InMemoryStore

- Package: `@lurker/core` (`src/journal/identity.ts`, `src/journal/scope.ts`, `src/journal/replayer.ts`, `src/stores/inmemory.ts`).
- Build: `JournalEntry` form per docs/03 (hashVersion field present from day one, written as 2); IdentityInput records per spawn kind and content-key derivation (sha256 over RFC 8785 JCS canonical JSON; exclusions: label, phase, onError, retry, replay, memoizeOutcome, lineage, spanId); scope-path grammar for sequential body, parallel (per-run monotonic call-site counter plus branch index), pipeline (stageIndex, itemIndex); ordinal assignment; per-run serialized append queue with JSON-serializability check (`NonSerializableValueError`); `JournalStore` SPI (5 methods) and `InMemoryStore` (resume disabled with a one-time loud warning); `TranscriptStore` SPI type.
- Inputs: docs/03 sections "Identity model", "Scope-path grammar", "JournalEntry form", "Storage SPI"; FR-0xx; DEF-6 (identity framing).
- Deliverables: `JournalEntry`, `JournalStore`, `TranscriptStore`, `InMemoryStore`, internal `Replayer` write path.
- Acceptance: identical calls in one scope get ordinals 0,1,2; a non-serializable value rejects at the call site; worked identity examples from docs/03 reproduce byte-identical keys.
- Tests: unit tests against the docs/03 worked examples (these become the seed of the M2 golden fixtures).
- Depends on: M1-T01, M1-T03.

#### M1-T05 Model router core

- Package: `@lurker/core` (`src/model/router.ts`, `src/model/caps.ts`).
- Build: per-engine adapter registry (duplicate adapterId is ConfigError; no global mutable registry); `ModelRef` strictly `adapterId:model`; resolution of the `ModelSpec` family into `CanonicalModelSpec` at dispatch (declarations from M1-T01); per-invocation resolution chain call override > agent profile > workflow default > engine default with role tag; `ModelCaps` consumption: structured-output tier selection (native | forced-tool | prompt), caps scrubbing with visible events (sampling params rejected on reasoning models are removed, never silently sent); `ProviderAdapter` SPI (`caps`, `refreshCaps?`, `stream`, `countTokens?`); SDK autoretries disabled rule surfaced in adapter contract.
- Inputs: docs/04 sections "ProviderAdapter SPI", "Router"; FR-1xx.
- Deliverables: `ProviderAdapter`, `ModelRef`, `ModelSpec`, `CanonicalModelSpec`, `ModelCaps`, `InvocationRole`, resolution internals.
- Acceptance: `AgentOpts.model` overrides all roles at once; `AgentOpts.routing` overrides per-role above profile.routing; scrub emits an event.
- Tests: unit tests over a minimal inline fake ProviderAdapter with caps variants (FakeAdapter proper lands in M1-T14, which needs only this task's SPI; the inline fakes are superseded then).
- Depends on: M1-T01, M1-T02.

#### M1-T06 Agent runtime v1

- Package: `@lurker/core` (`src/runtime/agent-loop.ts`, `src/runtime/structured-output.ts`, `src/runtime/usage-limits.ts`).
- Build: the single subagent loop: model turn, structured output in three tiers with client validation and bounded re-prompt (default 2 attempts under UsageLimits), `ModelRetry` for model-recoverable errors, `AgentError` classification fields, `AgentResult<T>` with initial status vocabulary ok|error|limit|cancelled|skipped (escalated arrives in M3 as the flagged breaking change), roles loop/extract trigger protocol (extract only when schema set and routing or caps demand a separate invocation); baseline UsageLimits: maxTurns (default 32), timeoutMs, streamIdleTimeoutMs (default 120000), expiry as terminal `limit`.
- Inputs: docs/06 section "Agent Runtime binding"; docs/06 section "UsageLimits (normative)"; FR-2xx.
- Deliverables: `AgentResult`, `AgentError`, `ModelRetry`, internal runAgent.
- Acceptance: schema mismatch re-prompts at most twice then returns error kind schema-mismatch; limit expiry writes status `limit`; no throw escapes policy.
- Tests: unit tests over a minimal inline fake adapter (see the M1-T05 note; re-run over FakeAdapter once M1-T14 lands); type tests for `AgentResult`.
- Depends on: M1-T04, M1-T05.

#### M1-T07 Ctx primitives

- Package: `@lurker/core` (`src/engine/ctx.ts`).
- Build: the canonical `Ctx` interface: `agent` overloads including `{ result: 'full' }` returning `AgentResult<Out<S>>`; `parallel` with `Settled<T>` (discriminated union over AgentStatus carrying AgentResult) and `abortSiblings`; `pipeline` up to 6 stages with `onItemError` and `run.dropped`; `step` with deps keying and `opts.key`; `phase<T>(name, fn)` (cosmetic for identity, structural for events and CostReport.byPhase); `log(level, msg, data?)`; `budget` accessor; `now()/random(key?)/uuid()` shims journaling as kind `rand` subtypes keyed by (scope, ordinal); `errorPolicy` literal generic typing (`strict`/`lenient`), onError `'null'` surfacing via `run.dropped`.
- Inputs: docs/06 sections "Canonical Ctx interface", "Error policy and dropped results"; docs/03 kinds registry (rand subtypes); FR-2xx.
- Deliverables: `Ctx`, `Settled`, `defineWorkflow`, `AgentOpts`, `SpawnOptions` (with `memoizeOutcome?` reserved field journaled as policy from day one).
- Acceptance: type of `ctx.agent` return follows effective error policy; dropped pipeline items appear in `run.dropped` with full errors; shims are deterministic per (scope, ordinal).
- Tests: unit plus expect-type tests; shim determinism test across two identical runs.
- Depends on: M1-T04, M1-T06.

#### M1-T08 Scheduler and concurrency

- Package: `@lurker/core` (`src/engine/scheduler.ts`).
- Build: per-run semaphore (default 12) with queue; engine lifetime cap 500 spawns (configurable); parallel barrier journaling each branch on completion, `abortSiblings` default true under strict (aborted siblings written cancelled, rerun on resume; `settle: true` disables); pipeline streaming without inter-stage barrier.
- Inputs: docs/06 section "Scheduler"; FR-2xx.
- Deliverables: internal scheduler; config knobs registered in the docs/06 Appendix A defaults table.
- Acceptance: a failing strict branch aborts siblings; settle mode returns all `Settled` outcomes.
- Tests: unit concurrency tests with fake timers.
- Depends on: M1-T07.

#### M1-T09 Three-layer budget v1

- Package: `@lurker/core` (`src/engine/budget.ts`).
- Build: layer 1 admission before spawn (`spent + committedReserve >= ceiling` blocks; reserve = opts.estCost ?? profile.estCost ?? (countTokens(input) + maxOutputTokens) ?? engine flat default $0.50); layer 2 per-turn guard; layer 3 AbortSignal ceiling with partial usage written `usageApprox: true`; B0 immutable after start; documented overshoot bound of one turn per in-flight agent; script-mode exhaustion: typed `BudgetExhaustedError` (AgentError kind budget) from ctx primitives; run outcome `exhausted` overrides `error`, value undefined, dropped/pending plus full CostReport.
- Inputs: docs/06 section "Three-layer budget"; invariant I4 (docs/00); FR-2xx.
- Deliverables: budget internals, `Spend`, exhausted-outcome plumbing.
- Acceptance: crossing the ceiling mid-stream aborts with usageApprox; no API mutates B0 after start; exhausted outcome carries partial results.
- Tests: unit tests incl. exhaustion-overrides-error scenario.
- Depends on: M1-T08.

#### M1-T10 Event stream, RunHandle, minimal TUI

- Package: `@lurker/core` (`src/engine/events.ts`, `src/engine/run-handle.ts`); umbrella `lurker` (progress renderer).
- Build: `WorkflowEvent` envelope (runId, seq as independent per-run telemetry counter distinct from JournalEntry.seq, ts, spanId hierarchy run > phase > agent > tool > child); domain:verb lowercase catalog for the M1-relevant events (run:start/end, phase:start, agent:queued/start/end/error/schema-retry/stream, budget:update, log); `replayed: true` re-emission rule (journal-backed lifecycle events only, never stream deltas); `RunHandle` (runId, result, events, on, cancel); `RunOutcome`; minimal terminal progress renderer exported from the umbrella.
- Inputs: docs/09 sections "Event stream", "RunHandle"; FR-5xx.
- Deliverables: `WorkflowEvent`, `RunHandle`, `RunOutcome`, `renderProgress` (umbrella).
- Acceptance: spanId parentage correct for nested phase/agent/tool; event seq monotonic per run.
- Tests: unit event-ordering tests.
- Depends on: M1-T07.

#### M1-T11 Engine entry points and InProcessRunner

- Package: `@lurker/core` (`src/engine/engine.ts`, `src/runner/inprocess.ts`).
- Build: `createEngine({ adapters, stores, defaults, budgetDefaults, concurrency, extraDerivers })` (extraDerivers plumbed now, used from M2); `engine.run(wf, args, opts): RunHandle`; `RunStatus` = RunOutcome statuses plus `running`; `ScriptRunner` SPI; `InProcessRunner` with dev-mode warnings patching bare Date.now/Math.random usage detection; `Workflow` type (closure form).
- Inputs: docs/06 sections "Engine and ops API", "Script runners"; docs/02 section "Engine anatomy"; FR-2xx.
- Deliverables: `createEngine`, `Engine`, `ScriptRunner`, `InProcessRunner`.
- Acceptance: two engines in one process are fully isolated (no module state); ctx is created per run.
- Tests: unit isolation test (two engines, distinct registries).
- Depends on: M1-T09, M1-T10.

#### M1-T12 @lurker/anthropic adapter

- Package: `@lurker/anthropic` (`src/adapter.ts`, `src/wire.ts`, `src/caps.ts`).
- Build: adapter on the July 2026 Anthropic surface: adaptive thinking only (`{type:'adaptive'}`, budget_tokens, explicit disabled; temperature/top_p/top_k are 400s on current models, scrub via caps); `output_config { effort, format, task_budget }` with effort passthrough including max; structured outputs and strict tools (prefill tier dead on 4.6+); cache_control compilation from cacheHint (5m/1h TTLs, 4 breakpoints, model-dependent minimum prefix); thinking-block retention rule (always send retained blocks to Anthropic targets; server drops cross-model; no client-side stripping); pause_turn resume without synthetic user message with capped continuations; full stop-reason mapping including refusal with stop_details and model_context_window_exceeded; count_tokens; capabilities-bearing /v1/models as refreshCaps source; retry-after, x-ratelimit headers, 529 signaling to core retry policy; SDK autoretries disabled (max_retries 0); usage normalization at the boundary.
- Inputs: docs/04 section "@lurker/anthropic"; FR-1xx.
- Deliverables: `anthropic(opts): ProviderAdapter`.
- Acceptance: bijective canonical-to-wire tool-call id maps; Usage invariant asserted; all stop reasons map to typed finish outcomes.
- Tests: unit wire-mapping tests on recorded fixtures; live smoke test (manual, key-gated).
- Depends on: M1-T05.

#### M1-T13 @lurker/openai adapter

- Package: `@lurker/openai` (`src/adapter.ts`, `src/wire.ts`, `src/caps.ts`).
- Build: Responses API adapter: manual item-replay only (`store: false` plus include reasoning.encrypted_content; verbatim reasoning echo between tool calls; previous_response_id and Conversations rejected as incompatible with journal determinism); flattened function tools and strict semantics; `text.format` json_schema; typed SSE event catalog mapping to ChatEvent; Chat Completions as degraded path; reasoning.effort mapping with canonical max mapping to provider xhigh and provider `none` reachable only via namespaced providerOptions; SDK autoretries disabled; usage normalization.
- Inputs: docs/04 section "@lurker/openai (Responses API)"; FR-1xx.
- Deliverables: `openai(opts): ProviderAdapter`.
- Acceptance: reasoning items round-trip byte-exact between tool calls; strict json_schema tier verified.
- Tests: unit wire-mapping tests on recorded fixtures; live smoke test (manual, key-gated).
- Depends on: M1-T05.

#### M1-T14 @lurker/testing: FakeAdapter and createTestEngine

- Package: `@lurker/testing` (`src/fake-adapter.ts`, `src/test-engine.ts`, `src/matchers.ts`).
- Build: FakeAdapter keyed by agentType/label/prompt regex patterns with full type inference; `createTestEngine({ agents })`; vitest/jest matchers `toHaveCalledAgent(name, { times })`, `toStayUnderBudget({ usd })`.
- Inputs: docs/09 section "Test harness three tiers" (tier 1); FR-5xx.
- Deliverables: `FakeAdapter`, `createTestEngine`, matchers entry `@lurker/testing/matchers`.
- Acceptance: a workflow test runs with zero network and typed fake outputs.
- Tests: self-tests of the harness; replaces the minimal inline fakes used by M1-T05/M1-T06 (their unit tests re-run over FakeAdapter), breaking the test-dependency cycle: FakeAdapter needs only the M1-T05 SPI, while this task's full harness depends on the engine of M1-T11.
- Depends on: M1-T11.

#### M1-T15 Umbrella package

- Package: `lurker` (umbrella).
- Build: re-export `@lurker/core`, both first-class adapters, the file store (from M2 onward), and the terminal progress renderer; single-npm-install path; umbrella-only strong default model config slots (named strong defaults never live in `@lurker/core`).
- Inputs: docs/02 section "Package map"; docs/04 section "Role quality floors" (umbrella defaults note).
- Deliverables: umbrella exports map.
- Acceptance: `import { createEngine, anthropic, openai } from 'lurker'` works in a scratch project.
- Tests: install smoke test in CI on the packed tarball.
- Depends on: M1-T12, M1-T13, M1-T14.

### 3.3 M2, v0.3.0: durability (the Journal Kernel milestone)

Goal: durable resume with the complete, final replay semantics. All three kernel amendments and the full `replayDisposition` table land here as one table, strictly before Agent Runtime depth (DEF-1 ordering rule). The hashVersion 2 profile freezes here.

Entry criteria: M1 released; docs/03 complete and reviewed (identity, predicate, ref-entries, hashVersion, kinds registry v2, scope grammar); every docs/06 Appendix A knob marked "TBD before M2" (the large-value soft warn threshold) committed by a docs amendment.

Exit criteria: gating cassettes per section 2.1 green under replay-strict; `@lurker/store-conformance` passes on InMemoryStore and JsonlFileStore; frozen golden fixtures committed (one per hashVersion profile); v0.3.0 released. Packages first published: `@lurker/compat`, `@lurker/store-conformance`.

#### M2-T01 Storage contract hardening and JsonlFileStore

- Package: `@lurker/core` (`src/stores/jsonl.ts`, `src/l0/spi/store.ts`).
- Build: normative JournalStore contract A1 atomicity (a partially written entry is never visible in load), A2 total per-run order (load returns exactly the order of successful appends, stable across calls), A3 read-your-writes, A4 opaque payload (unknown kinds and fields pass byte-exact); `JsonlFileStore` (journal doubles as an event log); `LeasableStore` SPI type with fencing epoch semantics (acquire on a held lease rejects with typed `LeaseHeldError`; renew interval at most ttl/3; stale-epoch append rejected and invisible); RunMeta written by the engine (runId, status, name, tags, updatedAt, advisory hashVersionLow/High, plus the optional workflow-binding fields workflowName/workflowHash/workflowSourceRef per docs/03 section "RunMeta" and the OQ-21 interim rule) so listRuns needs no payload parsing.
- Inputs: docs/03 section "Storage SPI"; FR-0xx; DEF-4 (contract tightening).
- Deliverables: `JsonlFileStore`, `LeasableStore`, `Lease`, `RunMeta`, `RunFilter`.
- Acceptance: A1-A4 demonstrably hold under crash-injection tests; RunMeta listing works without loading journals.
- Tests: unit plus the conformance kit (M2-T11) run against both shipped stores.
- Depends on: M1-T04.

#### M2-T02 Two-phase entries and at-least-once dispatch

- Package: `@lurker/core` (`src/journal/replayer.ts`).
- Build: two-phase writes (`running` at dispatch, terminal with back-reference); dangling `running` after crash means redispatch (at-least-once dispatch, exactly-once reuse of completed work); orphaned-entry reporting (deletion of a call marks the entry orphaned in the resume report); usage recorded on every terminal entry (usageApprox on stream abort).
- Inputs: docs/03 section "Two-phase entries, dispatch, and the budget ledger"; FR-0xx.
- Deliverables: two-phase write path; orphan report type.
- Acceptance: killing a run mid-dispatch and resuming redispatches exactly the dangling call; completed neighbors are never re-paid.
- Tests: crash-injection unit tests.
- Depends on: M2-T01.

#### M2-T03 Scoped forward-matching and resume

- Package: `@lurker/core` (`src/journal/matching.ts`).
- Build: per-scope forward cursors; a key match ahead of the cursor replays; a miss does not move the cursor and does not extinguish future hits (insertion stability: inserting one new call costs exactly one live call); no global prefix-flip; per-call replay modes `cache` (ordinal-aware whole-run matching) and `never`; `opts.key` pinning volatile-prompt identity; documented residual edge (intentionally identical calls reordered within one scope bind in journal order; mitigated by opts.key and a lint rule); budget ledger fold on resume (spend neither reset nor double-counted).
- Inputs: docs/03 section "Scoped forward-matching, ordinal rules"; docs/03 section "Two-phase entries, dispatch, and the budget ledger"; FR-0xx; NFR determinism.
- Deliverables: matching engine; `replay` per-call option.
- Acceptance: insert-one-call scenario pays exactly one live call; ledger after resume equals ledger of an uninterrupted run.
- Tests: unit matrix over insert/delete/reorder scenarios; property test on cursor stability.
- Depends on: M2-T02.

#### M2-T04 Kinds registry v2 and scope grammar freeze

- Package: `@lurker/core` (`src/journal/kinds.ts`, `src/journal/scope.ts`).
- Build: the complete kinds registry v2 with a normative payload schema per kind: agent, step, external, rand (subtype discriminator for now/random/uuid), child, approval, decision (with decisionType), plan.revision, plan.decision, ledger.op, resolution, abandon, node.link, termination.init, termination.denied; stored status vocabulary running|ok|error|limit|suspended|cancelled|escalated (`skipped` never stored, derived only); scope grammar finalized as formal BNF including nested workflow scopes, orchestrator handle spawns, and `plan/NodeId` (producers of the later kinds arrive in M6/M7; the registry and grammar freeze NOW so the v2 identity profile never moves); no automatic value offload in v1, configurable soft warn threshold on payload size.
- Inputs: docs/03 sections "Scope-path grammar", "JournalEntry form; kinds registry v2"; FR-0xx; DEF-1/DEF-4/DEF-6 markers on the folded rules.
- Deliverables: `EntryKind`, payload schema validators, scope path builder/parser.
- Acceptance: every kind's payload schema validates its docs/03 example; unknown-kind bytes pass through stores untouched (A4).
- Tests: unit schema tests per kind; grammar round-trip property test.
- Depends on: M2-T03.

#### M2-T05 hashVersion mechanism and @lurker/compat

- Package: `@lurker/core` (`src/journal/keyderiver.ts`, `src/journal/normalize.ts`); `@lurker/compat`.
- Build: `KeyDeriver` SPI (hashVersion, project to CanonicalIdentity or `'incomparable'`, deriveKey, schemaHash, toolsetHash, frozen `dispositionTable` data, `foldDefaults` with v1 = effort medium, memoizeOutcome false, budgetAccount root); frozen v1 and v2 profiles; `normalizeEntry` (legacy field `v` read as hashVersion, never rewritten on disk); `CURRENT_HASH_VERSION = 2`; support window [CURRENT-2, CURRENT]; matching under the version of the entry (live call projected DOWN by the entry's profile; incomparable is a guaranteed non-match); one compatibility scan immediately after load, strictly before any live call, append, or admission reserve, and again at lease acquire; `JournalCompatibilityError` with codes HASH_VERSION_TOO_OLD / HASH_VERSION_TOO_NEW and hint; `EngineOptions.extraDerivers` as the only window extender; `@lurker/compat` package carrying frozen out-of-window derivers (initially ships the extraDerivers plumbing plus a synthetic test deriver; real derivers move in as versions age out); v1-pair rule: a dangling v1 `running` entry redispatches as a fresh v2 running entry, the v1 orphan is reported; compatibility lemma test (on the v1 domain both disposition tables agree).
- Inputs: docs/03 section "hashVersion (DEF-6)"; FR-0xx; DEF-6.
- Deliverables: `KeyDeriver`, `CURRENT_HASH_VERSION`, `normalizeEntry`, `JournalCompatibilityError`, `@lurker/compat` exports.
- Acceptance: mixed-version journals resume deterministically; out-of-window journals refuse side-effect-free; keys memoized per (call, version).
- Tests: contract tests on frozen journal fixtures (one per profile); mixed-version scenarios; the DEF-6 cassette set.
- Depends on: M2-T04.

#### M2-T06 Canonical replay predicate with the three kernel amendments (DEF-1)

- Package: `@lurker/core` (`src/journal/disposition.ts`).
- Build: the single canonical pure function `replayDisposition(entry, abandonFold): 'replay' | 'rerun' | 'skip'` computed in two steps: step 1 effective-status fold (AbandonFold as a projection of the DEF-4 first-wins fold over `abandon` entries, direct and transitive child-scope-prefix coverage; covered entries get derived skipped over any terminal status, payload stays addressable); step 2 the full per-effective-status table including all three amendments (memoizeOutcome opt-in replaying task-class failures; abandon yielding derived skipped; escalated-replays-as-ok, meaning the predicate treats the entry as completed paid work while the consumer still sees status escalated and the byte-identical report) and the alias column (DEF-5: skipped under an incoming node.link alias is match-eligible with its pre-abandon terminal status; ok and escalated match, error and cancelled rerun live; skipped without alias always skips); the table is data on the version profile, dispatched by the entry's hashVersion; `classifyAgentError(e): 'transport' | 'task'` (task: schema-mismatch, terminal, non-retryable tool; transport never memoized: transport, rate-limit, budget); memoizeOutcome read from the entry payload, never from current code; cancelled always reruns (memoizeOutcome inert on cancelled); dangling running reruns; suspended outside the table (consumed by the DEF-4 fold); invalidate/retry API for un-pinning memoized failures.
- Inputs: docs/03 section "Replay predicate (DEF-1)"; FR-0xx; DEF-1; OQ pointer for the invalidate/retry safety boundary (docs/14).
- Deliverables: `replayDisposition`, `ReplayDisposition`, `AbandonFold`, `classifyAgentError`, `ErrorClass`, invalidate/retry API.
- Acceptance: no layer above the kernel re-implements or overrides the predicate (enforced by review rule and a lint ban on importing disposition internals); table outputs byte-match the docs/03 table for every row and condition.
- Tests: exhaustive table-driven unit tests (every status x memoizeOutcome x classifier x abandon x alias combination); DEF-1 synthetic-fixture cassettes (abandon-subtree, memoize-classifier, v1-journal-on-v2).
- Depends on: M2-T05.

#### M2-T07 Ref-entries, first-closing-wins fold, ResolutionArbiter (DEF-4)

- Package: `@lurker/core` (`src/journal/resolution.ts`).
- Build: ref-entry family (kinds `resolution` and `abandon`; `ref` carries target seq, always ref < seq; excluded from scope cursors, found by fold over ref; scope field duplicates target scope for telemetry only); `ResolutionPayload` (target, by: external|timeout|class_decision|operator|quiescence|engine_fallback, value, decisionRef?, logicalTaskId?, countsAgainstLimit?) and `AbandonPayload` (target, authorizedBy, nodeId?, logicalTaskId?, reason, retainCheckpoint default true, retainWorktree default false); first-closing-wins fold (first schema-valid resolution in seq order, or first covering abandon, closes; later closers classify noop already_resolved|target_abandoned; schema-invalid offline resolution classifies invalid and does not close; classification never persisted); ordering rules O1-O5 (decision-before-effects; backward refs only, forward ref is `JournalOrderViolation`; abandon after its authorizing decision entry and before effects; transitive abandon coverage; abandon over a terminal ok entry allowed with the value staying addressable); per-run per-target FIFO `ResolutionArbiter` (classify against in-memory fold, durable append, settle the waiting promise exactly once; winner effects strictly after the critical section; losing attempts are still appended, becoming journaled noops); journaled `deadlineAt` on suspended entries with deterministic resume behavior (expired deadline enqueues a `by: 'timeout'` attempt; unexpired re-arms the timer for the remainder); `Replayer` extensions `resolveSuspended`, `abandonBranch`, `suspensionState`; the resolution `by` source mapping table per docs/03.
- Inputs: docs/03 sections "Suspension and resolutions (DEF-4)", "Abandon, derived skipped"; FR-0xx; DEF-4; XF markers on logicalTaskId/countsAgainstLimit fields.
- Deliverables: `ResolutionPayload`, `AbandonPayload`, `ResolutionAttempt`, `AbandonAttempt`, `ResolutionOutcome`, `SuspensionState`, internal `ResolutionArbiter`.
- Acceptance: two racing attempts on one target settle the promise exactly once with exactly one applied classification; identical fold state hash on JSONL and InMemory stores for the golden fixture.
- Tests: race unit tests; the DEF-4 cassette set; golden fold-state fixture shared with the conformance kit.
- Depends on: M2-T06.

#### M2-T08 awaitExternal and resolveExternal

- Package: `@lurker/core` (`src/engine/external.ts`).
- Build: `ctx.awaitExternal<T>(key, { schema?, prompt? })` writing a suspended entry (duplicate key in one scope is an immediate error; NO deadline on awaitExternal in v1, deadlineAt applies only to approvals and Flavor B escalations); run outcome `suspended` with `pending: PendingExternal[]`; `RunHandle.resolveExternal(key, value): Promise<ResolutionOutcome>` (live path validates against the pinned schema BEFORE append and throws typed `InvalidResolutionError` without journaling; offline appends validated by the fold at consumption); live resolution settles in place without replay.
- Inputs: docs/06 section "Canonical Ctx interface" (awaitExternal); docs/03 section "Suspension and resolutions"; FR-0xx, FR-2xx.
- Deliverables: `awaitExternal`, `resolveExternal`, `PendingExternal`.
- Acceptance: suspend/exit/resume/resolve round-trip works on JsonlFileStore; invalid live payload journals nothing.
- Tests: unit suspend/resume tests; offline-invalid-then-valid cassette (shared with DEF-4 set).
- Depends on: M2-T07.

#### M2-T09 engine.resume, run-to-definition binding, resume preview

- Package: `@lurker/core` (`src/engine/resume.ts`).
- Build: `engine.resume(runId, wf?)` per the binding contract (docs/06 section "Engine and ops API"): for in-process Workflows, RunMeta records `workflowName` and the body `workflowHash` at start (fields normative in docs/03 section "RunMeta", per the OQ-21 interim rule) with a loud warning on divergence at resume; CompiledWorkflow source persistence (TranscriptStore blob plus `workflowSourceRef`/`workflowHash` in RunMeta) arrives with M6-T05; resume preview: incremental hit/miss report during replay plus dry-run mode forbidding live calls until first divergence.
- Inputs: docs/06 section "Engine and ops API"; docs/03 section "Checkpoints" (resume preview); FR-2xx; OQ pointer (resume binding residuals, docs/14).
- Deliverables: `engine.resume`, `ResumePreview`, dry-run option.
- Acceptance: resuming with a modified workflow warns and reports orphans/misses honestly; dry-run performs zero live calls.
- Tests: unit tests over modified-workflow scenarios.
- Depends on: M2-T03, M2-T05.

#### M2-T10 Replay-strict runner

- Package: `@lurker/testing` (`src/replay-strict.ts`).
- Build: `replayRun(wf, args, { journal, mode: 'strict' })` throwing `JournalMissError` on any live call, turning any production journal into a deterministic integration test; CI wiring so cassette suites run strict by default.
- Inputs: docs/09 section "Test harness three tiers" (tier 3); FR-5xx; NFR determinism (replay-strict zero live calls).
- Deliverables: `replayRun`, `JournalMissError` integration.
- Acceptance: a strict replay of any M2 cassette performs zero live calls and byte-identical folds.
- Tests: self-test on a known-divergent journal (must throw at the exact miss).
- Depends on: M2-T06.

#### M2-T11 @lurker/store-conformance kit

- Package: `@lurker/store-conformance` (`src/journal.ts`, `src/leasable.ts`, `src/fixtures/`).
- Build: executable conformance suites `journalStoreConformance(mk)` and `leasableStoreConformance(mk)`: A1 atomicity, A2 total per-run order, A3 read-your-writes, A4 opaque payload; fencing (stale-epoch append rejected and invisible); acquire on a held lease rejects with typed `LeaseHeldError`; renew cadence at most ttl/3; golden fold-state fixtures with identical hashes across stores; end-to-end decide-once oracle (scripted race of two attempts, exactly one applied classification, then replay-strict); abandon fixture asserting zero live calls in a skipped subtree (FakeAdapter call counter).
- Inputs: docs/03 section "Storage SPI" (contract A1-A4, conformance obligations); docs/11 section "Conformance tier"; FR-0xx; DEF-4.
- Deliverables: both suites, published fixtures.
- Acceptance: InMemoryStore and JsonlFileStore pass; a deliberately reordering store fails loudly.
- Tests: the kit itself plus a mutation-tested bad store.
- Depends on: M2-T07, M2-T10.

#### M2-T12 M2 cassettes and frozen fixtures

- Package: `@lurker/testing` (fixtures), repo `cassettes/`.
- Build: record and freeze the M2 gating cassettes (section 2.1); commit the frozen v1 journal fixture (agent, step, rand, external, approval entries with legacy field `v: 1`) and the v2 golden identity fixtures (worked examples per spawn kind).
- Inputs: docs/09 section "Mandatory defect cassette catalog"; docs/11 sections "Frozen journal fixtures", "Replay-strict tier".
- Deliverables: cassette files, fixture files, CI jobs.
- Acceptance: all listed cassettes green under replay-strict; fixtures are write-protected in review (any diff to a frozen fixture fails CI without an explicit hashVersion-bump changeset).
- Tests: the cassettes.
- Depends on: M2-T05, M2-T06, M2-T07, M2-T08, M2-T11.

### 3.4 M3, v0.4.0: agent depth (BREAKING minor)

Goal: real tool-using agents: tool system, MCP, permission chain with ask suspensions, turn checkpoints, worktree isolation, and the flagged breaking change: terminal `escalated` status.

Entry criteria: M2 released (DEF-1 ordering rule satisfied: the predicate already handles escalated entries); every docs/06 Appendix A knob marked "TBD before M3" (the no-progress detector N) committed by a docs amendment.

Exit criteria: DEF-1 live cassette set green; changeset carries a BREAKING section documenting the `AgentStatus` extension with the migration note (add an `escalated` branch to every switch; non-adopters map it as `limit`); v0.4.0 released.

#### M3-T01 Tool system core

- Package: `@lurker/core` (`src/tools/tool.ts`, `src/tools/toolset-hash.ts`, `src/tools/context.ts`).
- Build: `tool()` definition and `ToolDef` (name, description, parameters: SchemaSpec, version?, executor? declared capability inprocess|subprocess|container, needsApproval?, risk?, execute(input: Out<S>, ctx: ToolContext)); toolsetHash from the contract only (name, description, canonical parameters JSON Schema, version; never the execute closure; semantic changes are version bumps); `ToolContext` surface per docs/08; executors: only `inprocess` enforced in v1, subprocess/container remain declared capability with the containment posture downgraded to plans until the executor spec closes (OQ pointer, docs/14).
- Inputs: docs/08 sections "tool() definition and ToolDef", "ToolContext surface", "Executors"; FR-4xx.
- Deliverables: `tool`, `ToolDef`, `ToolRisk`, `ToolContext`, toolsetHash derivation.
- Acceptance: editing an execute body does not change toolsetHash; bumping version does.
- Tests: unit hash tests; type inference tests for the three SchemaSpec forms.
- Depends on: M2-T04 (frozen toolsetHash rules).

#### M3-T02 Turn-boundary checkpoints

- Package: `@lurker/core` (`src/journal/checkpoint.ts`, `src/runtime/agent-loop.ts`).
- Build: with a durable store, the runtime writes a canonical-history checkpoint at every turn boundary into TranscriptStore; approvals and crashes continue from the same turn; tools are at-least-once between execution and checkpoint write (idempotency recommendation documented); compaction points recorded in the checkpoint (compaction itself completes in M4-T03); checkpoint blob format declared engine-internal with a leading format byte (OQ pointer, docs/14).
- Inputs: docs/03 section "Checkpoints"; FR-0xx, FR-2xx.
- Deliverables: checkpoint writer/loader, `checkpointRef` plumbing.
- Acceptance: kill-and-resume mid-agent re-enters at the last turn boundary with zero re-paid turns.
- Tests: crash-injection unit tests.
- Depends on: M2-T02.

#### M3-T03 Permission chain and ask suspensions

- Package: `@lurker/core` (`src/runtime/permission-chain.ts`).
- Build: the normative chain hooks -> deny rules -> ask rules -> canUseTool -> terminal default (allow unless `needsApproval: true`, then ask); hook API `(toolName, input, ctx) => allow | deny | ask | { modifiedInput }`, sync or async, deterministic registration order; subagent inheritance only by explicit opt-in; `ask` journaled as a suspended approval entry together with the turn checkpoint; resume continues the same turn without re-paying turns or re-running tools.
- Inputs: docs/08 section "Permission chain, normative and complete"; FR-4xx; DEF-4 (suspension machinery reuse).
- Deliverables: chain evaluator, rule types, approval suspension wiring.
- Acceptance: approval round-trip across process exit resumes the same turn; deny short-circuits before canUseTool.
- Tests: unit chain-order tests; suspension round-trip cassette.
- Depends on: M3-T01, M3-T02.

#### M3-T04 MCP ToolSource

- Package: `@lurker/core` (`src/tools/mcp.ts`).
- Build: `mcp(cfg)` with transports stdio | streamable-http | inprocess on `@modelcontextprotocol/sdk` ^1.29 (the SDK v2 migration is the explicit post-M3 task M5-T10; risk R1, section 7); tools/list cursor pagination with per-session cache; listChanged handling; allow/deny filters and name-collision prefixing; inputSchema/outputSchema/structuredContent/isError mapping onto tool-result journal entries; needsApproval integration into the permission chain; ToolSource makes native, in-process MCP, and remote MCP tools indistinguishable to the runtime.
- Inputs: docs/08 section "MCP bus"; FR-4xx.
- Deliverables: `mcp`, `ToolSource` implementation.
- Acceptance: an MCP tool passes through the same permission chain and journals identically to a native tool; isError maps to tool error results, not protocol errors.
- Tests: unit tests against an in-process MCP server fixture.
- Depends on: M3-T01, M3-T03.

#### M3-T05 Worktree isolation

- Package: `@lurker/core` (`src/tools/isolation.ts`).
- Build: `IsolationProvider` (acquire/collect/dispose) with the worktree lifecycle: created from HEAD or a given ref of the host git repo; agent tools get cwd inside; collect() captures changed files and patch into TranscriptStore and `AgentResult.artifacts`; applying the patch stays with the caller; dispose with keepOnError; non-git host is typed ConfigError; `IsolationSpec = 'none' | 'readonly' | { kind: 'worktree', ref? }` as the canonical identity encoding; `maxPinnedWorktrees` default 4 (shared later by park/unpark and retainWorktree).
- Inputs: docs/08 section "IsolationProvider and worktree lifecycle"; FR-4xx; NFR security posture (sandbox is a determinism/blast-radius boundary, not security).
- Deliverables: `IsolationProvider`, `IsolationSpec`, worktree implementation.
- Acceptance: patch round-trip lands in artifacts; identity differs across IsolationSpec values.
- Tests: unit tests against a temp git repo.
- Depends on: M3-T01.

#### M3-T06 openaiCompatible factory

- Package: `@lurker/openai` (`src/compatible.ts`).
- Build: `openaiCompatible({ id, baseURL, apiKey?, caps? })` for Ollama, vLLM, gateways; explicit ids let several endpoints coexist; conservative caps defaults when unprobed.
- Inputs: docs/04 section "openaiCompatible factory contract"; FR-1xx.
- Deliverables: `openaiCompatible`.
- Acceptance: two instances with distinct ids register side by side; duplicate id is ConfigError.
- Tests: unit tests with a local stub server.
- Depends on: M1-T13.

#### M3-T07 Terminal escalated status and EscalationReport (BREAKING, DEF-1)

- Package: `@lurker/core` (`src/runtime/escalation.ts`, `src/l0/messages.ts` delta).
- Build: extend `AgentStatus` with `'escalated'`; `AgentResult.escalation?: EscalationReport` present iff status escalated; `EscalatedResult<T>` and `isEscalated` guard; typed `EscalationReport` (closed `EscalationKind = scope_bigger | scope_different | blocked_with_evidence`; scopeDelta; revisedEstimate { usd, turns }; blockers; proposedDecomposition: TaskSpec[]; costToDate and salvage { transcriptRef, artifacts, worktreePatchRef? } filled by the runtime, never the model; report schema-validated BEFORE append); status generation gated by opt-in (`SpawnOptions.escalation`; without it the status is physically unproducible); Flavor A: worker finishes with the terminal escalated entry (usage/costUsd/turns/transcriptRef as for ok, output null); Flavor B basics: the `escalate` tool suspends the agent on the existing suspension machinery with journaled deadlineAt; timeout expressed as a `by: 'timeout'` resolution through the ResolutionArbiter, dispose collects the worktree patch into salvage before destruction (an agent never resumes into a destroyed environment); ordering: terminal escalated entry strictly before the owner's decision entry, decision entry strictly before its effects; escalated child inside `ctx.parallel` is a settled outcome, not an error (onError does not fire); `onEscalation` hook on InProcessRunner; script modes return the escalated `AgentResult` to calling code.
- Inputs: docs/03 section "Replay predicate" (escalated rows already frozen in M2); docs/07 section "EscalationProtocol" (report/kind typing); docs/06 section "Agent Runtime binding"; FR-2xx, FR-3xx; DEF-1.
- Deliverables: `AgentStatus` (extended), `EscalationReport`, `EscalationKind`, `EscalatedResult`, `isEscalated`, `escalate` tool, `onEscalation`.
- Acceptance: without opt-in no workflow can observe the new status at runtime; a replayed escalated entry yields the byte-identical report with zero adapter calls; usage folds into the ledger exactly once.
- Tests: unit gating tests; DEF-1 live cassettes (escalate-replay, crash-between-report-and-decision, flavor-b-timeout).
- Depends on: M3-T02, M2-T06, M2-T07.

#### M3-T08 No-progress abort class

- Package: `@lurker/core` (`src/runtime/no-progress.ts`).
- Build: engine-defined no-progress detector journaled as a first-class terminal abort class distinct from user cancellation (otherwise it would land in cancelled and be re-paid on every resume); conservative default heuristic: N turns without tool calls or artifact deltas, with N read from the committed docs/06 Appendix A value (an M3 entry criterion commits it; the broader heuristic stays OQ-15 in docs/14; implement the interim rule, never an ad-hoc value).
- Inputs: docs/06 section "Agent Runtime binding"; docs/14 OQ register (no-progress detector); FR-2xx.
- Deliverables: detector, journaled abort entries.
- Acceptance: a no-progress abort replays without live calls and never reruns.
- Tests: unit tests with FakeAdapter loops.
- Depends on: M3-T07.

#### M3-T09 In-run minSpend enforcement

- Package: `@lurker/core` (`src/runtime/escalation.ts`).
- Build: `minSpendBeforeEscalation` (EscalationOptions.minSpendUsd, default 0) enforced INSIDE the run: structured output rejects early escalation with a bounded "keep working" re-prompt; kinds `scope_different` and `blocked_with_evidence` are exempt and carry `countsAgainstLimit = false`.
- Inputs: docs/07 section "EscalationProtocol" (EscalationOptions); FR-3xx.
- Deliverables: enforcement in the escalation path.
- Acceptance: premature scope_bigger escalation below minSpend is re-prompted, exempt kinds pass through.
- Tests: unit tests.
- Depends on: M3-T07.

#### M3-T10 UsageLimits completion

- Package: `@lurker/core` (`src/runtime/usage-limits.ts`).
- Build: complete `UsageLimits`: maxTurns (default 32), maxToolCalls, maxOutputTokensPerTurn?, timeoutMs, streamIdleTimeoutMs (default 120000), run-level deadline; expiry semantics: terminal `limit`, task class, replays under memoizeOutcome; interaction with abortSiblings; every default in the docs/06 Appendix A table with explicit unlimited-by-default markers.
- Inputs: docs/06 section "UsageLimits (normative)"; FR-2xx.
- Deliverables: `UsageLimits`, enforcement points.
- Acceptance: each limit independently produces status `limit` with the correct journal payload.
- Tests: unit per-limit tests.
- Depends on: M3-T01.

#### M3-T11 M3 cassettes and BREAKING release notes

- Package: repo `cassettes/`, `.changeset/`.
- Build: record the M3 gating cassettes; write the BREAKING changeset (AgentStatus extension, third kernel amendment reference, migration note, isEscalated/EscalatedResult exports); re-record the M2 synthetic DEF-1 subset through the live runtime.
- Inputs: docs/12 section "Pre-1.0 convention"; docs/09 cassette catalog.
- Deliverables: cassettes; changeset with BREAKING section.
- Acceptance: all M3 gating cassettes green under replay-strict.
- Tests: the cassettes.
- Depends on: M3-T07, M3-T08, M3-T09.

### 3.5 M4, v0.5.0: model layer completion

Goal: multi-model correctness end to end: full role protocol, cross-provider history projection, failover, pricing, canonical effort semantics, floors.

Entry criteria: M3 released.

Exit criteria: a mixed-provider agent (loop on one provider, extract/finalize on another) round-trips correctly; pricing report shows no silent zeros; v0.5.0 released.

#### M4-T01 Role protocol completion

- Package: `@lurker/core` (`src/model/roles.ts`).
- Build: full trigger protocol for the six roles: loop each turn while tools are available; extract as a separate final structured-output invocation only when a schema is set AND (routing directs extract elsewhere or current caps cannot serve the tier), otherwise the schema rides the last loop turn; finalize only if routed: post-tool-stop synthesis with toolChoice none over the full transcript; summarize at the compaction threshold; plan and orchestrate resolved through the same chain.
- Inputs: docs/04 section "Router and resolution chain" (role protocol); FR-1xx.
- Deliverables: role trigger implementation.
- Acceptance: no extra extract call when the loop model can serve the tier; finalize fires only when routed.
- Tests: unit tests per trigger rule.
- Depends on: M3-T11.

#### M4-T02 HistoryProjector

- Package: `@lurker/core` (`src/model/projector.ts`).
- Build: projection of canonical history into the target provider's wire view: canonical id bijection maps per adapter; provider-raw parts stored unconditionally, projected only to the matching provider; thinking-block retention rule (always send retained blocks to Anthropic targets; server handles cross-model drops; no client-side stripping); compaction blocks/items preserved in canonical history (server-side compaction itself out of scope v1, docs/04 section "Server-side compaction position").
- Inputs: docs/04 sections "Wire contract", "@lurker/anthropic" (retention rule); FR-1xx.
- Deliverables: `HistoryProjector` internals.
- Acceptance: per-role provider mixing inside one agent yields valid wire histories for both providers; ids survive round-trips bijectively.
- Tests: unit projection tests on mixed transcripts.
- Depends on: M4-T01.

#### M4-T03 Compaction ownership

- Package: `@lurker/core` (`src/runtime/compaction.ts`).
- Build: Agent Runtime owns compaction: history processors per profile plus a contextWindow threshold (default 0.8); compaction points written to the checkpoint; summarize role invocation at threshold.
- Inputs: docs/06 section "Agent Runtime binding"; docs/06 Appendix A (threshold default); FR-2xx.
- Deliverables: compaction pipeline.
- Acceptance: compaction survives resume (points restored from checkpoint); no re-summarize on replay.
- Tests: unit tests with long fake transcripts.
- Depends on: M4-T01, M3-T02.

#### M4-T04 Failover and the degenerate fallback field

- Package: `@lurker/core` (`src/model/failover.ts`).
- Build: failover keyed on the REQUESTED modelSpec (a failover-served response replays correctly; fallback changes only `servedBy`); `FailoverTrigger = 'transport' | 'rate-limit'` with budget explicitly excluded; degenerate `fallback: { model, on }` field with `on` a subset of error|limit|schema-exhausted, one journaled decision entry.
- Inputs: docs/04 section "RetryPolicy under the journal; failover"; FR-1xx.
- Deliverables: failover engine, `FailoverTrigger`, `fallback` option.
- Acceptance: replay of a failover-served entry is stable and attribution honest (servedBy differs, key does not).
- Tests: unit failover tests; replay-strict check on a failover journal.
- Depends on: M4-T01.

#### M4-T05 RetryPolicy under the journal

- Package: `@lurker/core` (`src/model/retry.ts`).
- Build: RetryPolicy (attempts, backoff, retryable classes) living BELOW the journal: retried-then-successful is one journal entry; transport retries never count as lineage attempts; Retry-After respected; core owns wall-clock.
- Inputs: docs/04 section "RetryPolicy under the journal"; FR-1xx; DEF-3 interaction (attempt counting).
- Deliverables: retry engine wired into adapter streaming.
- Acceptance: N transport retries produce one journal entry with one usage total.
- Tests: unit tests with injected transport failures.
- Depends on: M4-T04.

#### M4-T06 Versioned price table and refreshCaps

- Package: `@lurker/core` (`src/model/pricing.ts`).
- Build: registry versioned price table winning over caps.pricing (adapter-reported fallback); `pricingVersion` monotonic string recorded in decision entries; unpriced models surfaced in CostReport, never silent zero; `refreshCaps()` updating the capability table from live model lists.
- Inputs: docs/04 section "Pricing"; FR-1xx.
- Deliverables: price table, `pricingVersion` plumbing.
- Acceptance: an unknown model shows as unpriced in CostReport; price table update does not disturb replay (decision entries pin pricingVersion).
- Tests: unit pricing tests.
- Depends on: M4-T01.

#### M4-T07 Per-provider concurrency keys

- Package: `@lurker/core` (`src/model/concurrency.ts`).
- Build: per-provider concurrency keys beside the router; interplay with the per-run semaphore; documented absence of a distributed cross-process limiter (EXC pointer; process-global limiter is OQ, docs/14).
- Inputs: docs/04 section "Router and resolution chain"; docs/06 section "Scheduler"; FR-1xx, FR-2xx.
- Deliverables: keyed limiter.
- Acceptance: two adapters throttle independently under load.
- Tests: unit tests with fake timers.
- Depends on: M4-T05.

#### M4-T08 Canonical effort completion

- Package: `@lurker/core` (`src/model/effort.ts`), both adapters.
- Build: complete canonical effort semantics on the five-level enum (already in identity via the M2 v2 profile): role effort defaults (orchestrate/plan high, summarize/extract low); unsupported effort scrubbed VISIBLY with an event, never mapped into max_tokens; per-adapter mapping table conformance (Anthropic output_config.effort passthrough including max; OpenAI reasoning.effort with canonical max -> provider xhigh; provider none reachable only via namespaced providerOptions); v1-profile insensitivity to effort verified (fold-default medium applies only in derived reads: pricing, ladder stats, never matching).
- Inputs: docs/04 section "Canonical effort"; docs/03 section "hashVersion" (fold defaults); FR-1xx; DEF-6.
- Deliverables: effort resolution and scrub events; adapter mapping updates.
- Acceptance: effort-defaults-shift cassette stays green (paid v1 prefix matches under any live effort).
- Tests: unit mapping tests; DEF-6 effort cassette re-run.
- Depends on: M4-T01, M2-T05.

#### M4-T09 Role quality floors and umbrella strong defaults

- Package: `@lurker/core` (`src/model/floors.ts`); umbrella `lurker`.
- Build: per-role explicit model allow/deny lists in engine config (optionally per declared taskClass); floors are hard router constraints that no advice (including ModelKnowledge later) overrides or weakens; no cross-adapter quality ordering exists; named strong orchestrate/plan defaults live ONLY in umbrella config, never in `@lurker/core`.
- Inputs: docs/04 section "Role quality floors"; FR-1xx.
- Deliverables: floors config and enforcement; umbrella default config.
- Acceptance: a floored-out model is rejected at resolution with a typed error; core ships no named model strings.
- Tests: unit floor tests; grep test asserting no model names in core.
- Depends on: M4-T01.

### 3.6 M5, v0.6.0: ops ergonomics

Goal: day-2 operations: CLI with TUI, SQLite store, cost reporting, VCR cassettes with cron contract tests, permission presets, examples corpus.

Entry criteria: M4 released.

Exit criteria: `lurker run/resume/runs ls/inspect` work end to end against JsonlFileStore and SqliteStore; VCR record/replay green; examples corpus runs as integration tests; v0.6.0 released. Packages first published: `@lurker/cli`, `@lurker/store-sqlite`.

#### M5-T01 Workflow registry and @lurker/cli base

- Package: `@lurker/core` (workflow registry), `@lurker/cli` (`src/commands/run.ts`, `resume.ts`, `runs.ts`, `inspect.ts`, `src/tui/`).
- Build: explicit per-engine workflow registry consumed by shells (no module-level registry); canonical CLI grammar `lurker run <wf> --args --store --budget-usd`, `lurker resume <runId>`, `lurker runs ls`, `lurker inspect <runId>`, no aliases in v1; TUI progress renderer on the event stream.
- Inputs: docs/06 section "Engine and ops API" (registry, CLI grammar); docs/02 section "Shells overview"; FR-7xx.
- Deliverables: `lurker` CLI binary, workflow registry API.
- Acceptance: run/suspend/resume round-trip via CLI; inspect renders journal summary without payload parsing beyond the engine.
- Tests: CLI e2e tests against FakeAdapter.
- Depends on: M4 complete (uses public APIs only; shells building on public APIs is a standing seam-sufficiency test).

#### M5-T02 @lurker/store-sqlite

- Package: `@lurker/store-sqlite` (`src/store.ts`).
- Build: SqliteStore implementing JournalStore and LeasableStore with fencing epochs; the reference implementation for community stores.
- Inputs: docs/03 section "Storage SPI"; FR-0xx.
- Deliverables: `SqliteStore`.
- Acceptance: passes the full `@lurker/store-conformance` suites including fencing and golden fold fixtures.
- Tests: conformance; concurrency tests.
- Depends on: M2-T11.

#### M5-T03 Cost reports

- Package: `@lurker/core` (`src/engine/cost-report.ts`), `@lurker/cli`.
- Build: `CostReport` complete for non-adaptive fields (totalUsd, byModel, byPhase, byAgentType, unpriced surfacing; byRole and the orchestrator block arrive in M7-T12 per DEF-7); CLI cost view in inspect.
- Inputs: docs/09 section "RunHandle ... CostReport"; FR-5xx.
- Deliverables: `CostReport` builder, CLI rendering.
- Acceptance: report totals equal ledger fold totals exactly.
- Tests: unit reconciliation tests.
- Depends on: M4-T06, M5-T01.

#### M5-T04 VCR cassettes and cron contract tests

- Package: `@lurker/testing` (`src/vcr.ts`), repo CI.
- Build: VCR at the adapter boundary: `record({ adapters, cassette, redact? })` and `replay({ cassette, onMiss: 'throw' | 'passthrough' })`; redacted JSONL keyed by request hash; cassettes carry hashVersion in fixtures; cron-scheduled CI job replaying cassettes against live APIs as adapter contract tests (provider drift caught before users; spend and key ownership is a founder item, section 7).
- Inputs: docs/09 section "Test harness three tiers" (tier 2); docs/11 section "Cassette tier"; FR-5xx.
- Deliverables: `record`, `replay`, cron workflow.
- Acceptance: secrets never appear in cassette bytes; live drift produces a red cron run, not a red PR.
- Tests: self-tests with a stub adapter.
- Depends on: M2-T10.

#### M5-T05 Risk metadata, permission presets, audit, dry-run

- Package: `@lurker/core` (`src/tools/presets.ts`, `src/tools/audit.ts`).
- Build: `ToolRisk` enum read|write|network|execute|destructive as the `risk` field on ToolDef (docs/08 section "tool() definition and ToolDef"); `compilePermissionPreset` compiling presets INTO the existing chain (never a fifth layer); shipped presets strict/standard/open with their compiled rule tables per docs/08; audit events for allow/deny/ask; dry-run mode; network-domain rules enforced only for first-party fetch, advisory elsewhere (honest posture).
- Inputs: docs/08 section "Risk metadata and permission presets"; FR-4xx.
- Deliverables: presets, audit events, dry-run flag.
- Acceptance: preset compilation output equals the documented rule tables; dry-run journals decisions without executing tools.
- Tests: unit compilation tests per preset.
- Depends on: M3-T03.

#### M5-T06 Argv shell matcher

- Package: `@lurker/core` (`src/tools/shell-matcher.ts`).
- Build: shell allow/ask/deny via a real argv parser, not string prefixes; compound commands with any unmatched segment yield ask (`npm test; rm -rf` must be caught).
- Inputs: docs/08 section "Argv-parsing shell matcher"; FR-4xx.
- Deliverables: matcher, grammar.
- Acceptance: the documented compound-command cases produce ask.
- Tests: unit grammar table tests.
- Depends on: M5-T05.

#### M5-T07 RunProfile presets as data

- Package: `@lurker/core` (`src/engine/run-profiles.ts`).
- Build: RunProfile presets (fast/standard/deep/ultra and similar) shipped as DATA (role/effort/concurrency/budget/permission/spawn limits), never engine semantics; TaskGraph JSON allowed only as an optional constrained planner target compiling onto ctx.parallel/ctx.agent (no conditional edges, no YAML in core).
- Inputs: docs/06 section "Run profiles and TaskGraph"; FR-2xx; EXC pointers (no engine strategy enums).
- Deliverables: preset data types and loader.
- Acceptance: presets contain zero behavioral branches in engine code (data-only assertion in review).
- Tests: unit preset application tests.
- Depends on: M5-T05.

#### M5-T08 OTel exporter

- Package: `@lurker/cli` (`src/otel.ts`).
- Build: `toOtel(run, tracer)` mapping the spanId tree 1:1 onto OpenTelemetry spans; `@opentelemetry/api` ^1.9 as optional peer; gen_ai.* semconv attributes flagged unstable; attribute content policy deferring to the redaction OQ.
- Inputs: docs/09 section "OpenTelemetry mapping"; FR-5xx.
- Deliverables: `toOtel`.
- Acceptance: span parentage mirrors event spanIds; absent OTel dependency does not break the CLI.
- Tests: unit tests with an in-memory tracer.
- Depends on: M5-T01.

#### M5-T09 Examples corpus and docs pass

- Package: repo `examples/` (vitest project, not published).
- Build: reference implementations of the quality patterns (adversarial panels, judge panels, loop-until-dry, completeness critics) as recipes and prompt templates, never engine flags; each example doubles as an integration test and, later, as the planner API-card teaching corpus; documentation pass over the public API.
- Inputs: docs/00 section "Orchestration modes" (patterns-as-recipes stance); docs/11 section "Examples corpus"; FR-5xx.
- Deliverables: `examples/*` with tests.
- Acceptance: `vitest run` includes the examples project green on FakeAdapter.
- Tests: the examples themselves.
- Depends on: M5-T01.

#### M5-T10 MCP SDK v2 migration

- Package: `@lurker/core` (`src/tools/mcp.ts`).
- Build: the explicit post-M3 migration task promised by risk R1 (section 7): if the MCP SDK v2 line is stable by M5, migrate the MCP ToolSource from `@modelcontextprotocol/sdk` ^1.29 to v2 with the wire surface unchanged (transports, tools/list pagination and caching, filters/prefixing, schema and result mapping per docs/08 section "MCP bus"); the migration MUST NOT change tool-result journal entry shapes or toolsetHash derivation. If v2 is not yet stable, execute the assessment and record the deferral in the risk register with a new owning milestone no later than M8.
- Inputs: docs/08 section "MCP bus"; risk R1 (section 7); FR-4xx.
- Deliverables: migrated MCP bus, or a recorded deferral decision in section 7.
- Acceptance: the M3-T04 MCP suite is green on the chosen SDK line; zero journal shape diffs on the MCP fixtures.
- Tests: the existing MCP unit suite re-run; fixture byte-diff check.
- Depends on: M3-T04.

### 3.7 M6, v0.7.0: flagship hybrid and mode (c) substrate

Goal: the planner-writes-script flagship mode and the dynamic-orchestrator substrate: sandbox, lint/self-repair, spawn tools, admission, WakeDigest.

Entry criteria: M5 released.

Exit criteria: `runPlanned` executes a planner-authored script deterministically in the sandbox; `orchestrate()` survives crash-resume without re-generating spawn decisions; M6 cassettes green; v0.7.0 released. Packages first published: `@lurker/planner`, `eslint-plugin-lurker`.

#### M6-T01 CompiledWorkflow and compileScript

- Package: `@lurker/core` (types), `@lurker/planner` (`src/compile.ts`).
- Build: type-level split Workflow (closure, in-process only) vs CompiledWorkflow (source, sandbox-eligible; feeding a closure to the sandbox is a type error); `compileScript(source, { allowImports })` with rejection as typed `ScriptRejected`; allowImports default `[]`.
- Inputs: docs/06 section "Script runners"; FR-2xx.
- Deliverables: `CompiledWorkflow`, `compileScript`, `ScriptRejected`.
- Acceptance: closure-to-sandbox fails at compile time; disallowed import rejects with structured diagnostics.
- Tests: unit compile tests; type tests.
- Depends on: M5 complete.

#### M6-T02 WorkerSandboxRunner

- Package: `@lurker/planner` (`src/sandbox-runner.ts`, `src/sandbox-worker.ts`).
- Build: worker_threads sandbox with the curated global scope: exactly agent, parallel, pipeline, step, phase, log, budget, workflow, awaitExternal, now, random, uuid (seeded from runId, journaled); no import/fetch/process; every primitive call is JSON-RPC over MessagePort to the host engine; boundary contract is journal-compatible JSON payloads validated at the boundary, NOT raw structured clone; MessagePort transfer/ref/unref rules per docs/06 (ports closed or unrefed for clean shutdown); `step` fn executes inside the worker with its result RPCed to the host for journaling; `workflow` takes a registered workflow name string; timeoutMs default 300000, memoryMb default 512; sanctioned dialect rules enforced (schema only as JSON Schema literal, tools only by registered profile name, onError only 'throw'|'null', model as string, no functions in options, declarative rule-table policies, ladders as JSON).
- Inputs: docs/06 section "Script runners" (sandbox contract, global set, dialect); FR-2xx; NFR determinism.
- Deliverables: `WorkerSandboxRunner`.
- Acceptance: the exact global set matches the docs list (asserted by a test enumerating sandbox globals); a Date.now call inside the sandbox returns the journaled shim value; non-JSON value at the boundary is a typed error.
- Tests: sandbox determinism cassette (identical journals across two runs); boundary validation tests.
- Depends on: M6-T01.

#### M6-T03 eslint-plugin-lurker

- Package: `eslint-plugin-lurker` (`src/rules/`).
- Build: determinism rules: ban bare Date.now/Math.random/new Date/fetch/process.env in workflow modules; ban bare Promise.all over ctx calls (use ctx.parallel); duplicate-identical-call advisory (pairs with opts.key); structured JSON diagnostics for the self-repair loop.
- Inputs: docs/06 section "Script runners" (lint rules); FR-2xx.
- Deliverables: plugin with rule set and JSON diagnostic format.
- Acceptance: each rule fires on its fixture and emits machine-readable diagnostics.
- Tests: ESLint rule tester suites.
- Depends on: M6-T01.

#### M6-T04 profileCard and API card renderers

- Package: `@lurker/core` (`src/model/profile-card.ts`), `@lurker/planner` (`src/api-card.ts`).
- Build: `profileCard(registry)` emitting the same text for the planner prompt and the spawn_agent enum (both modes speak one agent vocabulary); the API card teaching exactly the sandbox dialect and global set, fed by the examples corpus.
- Inputs: docs/06 section "Script runners" (dialect); docs/07 section "Orchestrator toolset" (vocabulary sharing); FR-2xx, FR-3xx.
- Deliverables: both renderers.
- Acceptance: card text is deterministic (pure function of registry) and byte-stable across runs.
- Tests: golden-text tests.
- Depends on: M6-T02.

#### M6-T05 Planner agent and self-repair loop

- Package: `@lurker/planner` (`src/plan.ts`).
- Build: `plan(engine, goal, { model?, profiles?, repairRounds? })` -> `{ source, workflow, lint }`: planner model (role plan) writes a script against the API card and profile cards; lint via eslint-plugin-lurker; self-repair up to repairRounds (default 3) driven by JSON diagnostics; `runPlanned(engine, goal, args?)`; CompiledWorkflow source and hash persisted to TranscriptStore/RunMeta at start so planned runs are resumable (completes the M2-T09 binding contract).
- Inputs: docs/06 section "Modes and entry points"; docs/06 Appendix A (repairRounds); FR-2xx; OQ pointer (resume binding).
- Deliverables: `plan`, `runPlanned`.
- Acceptance: a failing lint round-trips through repair; re-planning after failure replays the unchanged prefix free.
- Tests: planner e2e on FakeAdapter; self-repair cassette.
- Depends on: M6-T03, M6-T04.

#### M6-T06 AdmissionController v1 and nested workflows

- Package: `@lurker/core` (`src/orchestrator/admission.ts`, `src/engine/budget.ts` delta).
- Build: the single admission point for all spawns: `admit(spec, origin)` called BEFORE journaling the carrying decision entry, verdict plus reserves plus statsBefore embedded IN the entry (replay never re-evaluates admission against live budget); configurable maxDepth (default 1, ceiling 4); maxChildrenPerNode (default 16); childBudgetFraction (default 0.3) computed from the parent remainder minus the parent finalizeReserve; lifetime cap; maxTotalSpawns; hierarchical budget sub-accounts with child spend rolled up to all ancestors; `ctx.workflow(child, args)` nesting through admission with journal scope and inherited sub-account; structural limit violations return typed errors to the orchestrator, never kill the run; the unified `AdmitVerdict` union scaffold (admit | reuse_full | admit_graft | reject with the merged reject-code set; reuse verdict branches implemented in M7-T07 but the union is closed now so consumer switches are written once).
- Inputs: docs/07 section "AdmissionController"; docs/06 Appendix A defaults; FR-3xx, FR-2xx; DEF-2/3/5 markers (verdict fields completed in M7).
- Deliverables: `AdmissionController`, `AdmitVerdict`, `AdmitRejectReason`, `ctx.workflow`.
- Acceptance: depth/quota/budget rejections embed the verdict in the decision entry and replay identically; child spend visibly rolls up to root.
- Tests: unit admission matrix; nesting depth tests.
- Depends on: M6-T01.

#### M6-T07 Dynamic orchestrator

- Package: `@lurker/core` (`src/orchestrator/orchestrate.ts`, `src/orchestrator/spawn-tools.ts`).
- Build: `orchestrate(engine, goal, opts)` and `ctx.orchestrate(goal, opts)` (both surfaces, one implementation; nested surface clamped under AdmissionController maxDepth with the nested cap bounded by the parent remainder minus the parent finalizeReserve); an ordinary workflow whose agent (role orchestrate) holds typed tools spawn_agent (with model_hint.startTier, approach, lineage fields per docs/07 schemas), parallel_agents, finish; mandatory turn-boundary checkpoints; every spawn is an ordinary kind `agent` journal entry; defined resume semantics: a crashed orchestrate() restores its history from the checkpoint and finds child results by content keys, never re-generating spawn decisions; non-PlanRunner applicability rules (only the lifetime cap, maxDepth, and budget layers; no termination.init; escalation caps only per declared lineage, otherwise the escalated result is simply returned).
- Inputs: docs/07 sections "Scope and applicability per mode", "Orchestrator toolset"; docs/06 section "Modes and entry points"; FR-3xx.
- Deliverables: `orchestrate`, `ctx.orchestrate`, spawn tool schemas.
- Acceptance: crash-resume cassette shows zero re-paid spawns and no duplicate spawn decisions.
- Tests: orchestrator crash-resume cassette (M6 gate); unit tool-schema validation tests.
- Depends on: M6-T06.

#### M6-T08 Handle-based await and cancel

- Package: `@lurker/core` (`src/orchestrator/handles.ts`).
- Build: handles = spawn entry seq, stable across resume; await_any/await_all over handles; cancel_agent for in-flight children (cancellation is caller intent: cancelled entries rerun on resume unless later covered by abandon).
- Inputs: docs/07 section "Orchestrator toolset" (await/cancel schemas); FR-3xx.
- Deliverables: the three tools.
- Acceptance: handles resolve identically before and after resume.
- Tests: unit tests; resume stability test.
- Depends on: M6-T07.

#### M6-T09 wait_for_events and coalesced WakeDigest substrate

- Package: `@lurker/core` (`src/orchestrator/wake.ts`).
- Build: `wait_for_events` writing a suspended entry on the DEF-4 machinery; trigger vocabulary: mandatory quiescence (nothing running and nothing ready), child_terminal, escalation, budget_threshold 50/80 (fixed in v1); immediate typed error when no trigger can possibly fire (an embedded run can never hang unrecoverably); coalesced `WakeDigest` substrate: digestSeq, coversToOrdinal, completedDigests: TaskDigest[] ({ nodeId, logicalTaskId, status, outputSummary, costUsd, artifactsIndex }; lineage fields filled from M7), escalations; digest pinned to the wake snapshot (a re-executed post-crash turn reads exactly the same digest); orchestrator sleeps between wakes, context grows O(wakes); renderBudget measured by the deterministic interim measure (OQ, docs/14).
- Inputs: docs/07 sections "Orchestrator toolset" (wait_for_events), "WakeDigest"; FR-3xx; DEF-4 (suspension), DEF-8 (quiescence completed in M7).
- Deliverables: `wait_for_events`, `WakeDigest` (substrate fields), `TaskDigest`.
- Acceptance: two simultaneous ready triggers produce one applied resolution and one noop (first-wins); digest bytes identical live vs replay.
- Tests: unit coalescing tests; race cassette.
- Depends on: M6-T08, M2-T07.

#### M6-T10 ctx.brief

- Package: `@lurker/core` (`src/engine/ctx.ts` delta).
- Build: `ctx.brief(opts): Promise<string>` as a journaled summarize invocation (role summarize) for handing an inheritable brief to a child.
- Inputs: docs/06 section "Canonical Ctx interface"; FR-2xx.
- Deliverables: `ctx.brief`.
- Acceptance: brief replays without a live call.
- Tests: unit test.
- Depends on: M6-T07.

#### M6-T11 lurker plan command and M6 cassettes

- Package: `@lurker/cli`, repo `cassettes/`.
- Build: `lurker plan "goal" --dry-run`; record the M6 gating cassettes sandbox-determinism, planner-self-repair, orchestrator-crash-resume (docs/09 M6/M8 substrate and soak set).
- Inputs: docs/06 section "Engine and ops API" (CLI grammar); FR-7xx.
- Deliverables: CLI command; cassettes.
- Acceptance: M6 gate green.
- Tests: the cassettes.
- Depends on: M6-T05, M6-T07, M6-T09.

### 3.8 M7, v0.8.0: adaptive orchestration full (BREAKING minor)

Goal: the complete adaptive machinery in `@lurker/plan`: PlanRunner with formal rebase, guards, park/unpark, RunLedger, ModelLadder, termination account, lineage, reuse-by-reference, orchestrator cap. DEF-2/3/5/7/8 all land here; DEF-2 MUST NOT merge before DEF-3 (the termination lemma is false without lineage folds).

Entry criteria: M6 released; docs/07 frozen; every docs/06 Appendix A knob marked "TBD before M7" (the escalation deadlineMs default) committed by a docs amendment.

Exit criteria: gating cassettes per section 2.1 green; H-OrchShare telemetry emitting; the changeset carries BREAKING sections matching the v0.8.0 rows of the docs/12 "Pre-1.0 convention" table (AdmitVerdict widening, reuse-by-reference default, `maxEscalationsPerLogicalTask` rename, plan-surface changes) with migration notes; v0.8.0 released. Package first published: `@lurker/plan`.

#### M7-T01 Plan scope substrate

- Package: `@lurker/plan` (`src/plan-state.ts`, `src/plan-hash.ts`, `src/write-lock.ts`).
- Build: TaskPlan as engine-owned typed data: nodes with NodeId = ULID assigned by the engine inside plan.revision; dependency DAG; PlanNodeStatus machine (pending, ready, running, parked, escalated, done, failed, cancelled, skipped) with immutable done; planHash = sha256 of canonical JSON PlanState (nodes sorted by NodeId with the exact field list per docs/07, plus fold counters revisionCount and droppedRevisionStreak; nothing wall-clock or telemetric); the single sequential scope "plan" (total order = ordinal order = durable append order); PlanWriteLock serializing ONLY plan-scope appends (never a substitute for the ResolutionArbiter).
- Inputs: docs/07 section "PlanRunner (DEF-8)"; FR-3xx; DEF-8.
- Deliverables: `TaskPlan`, `PlanNodeStatus`, planHash, PlanWriteLock internals.
- Acceptance: planHash reproduces byte-identically from any store; head assert failure raises `PlanInvariantError`.
- Tests: unit hash determinism tests.
- Depends on: M6-T09.

#### M7-T02 Lineage LTID (DEF-3)

- Package: `@lurker/core` (`src/journal/lineage.ts`).
- Build: `LogicalTaskId` (ULID) minted by the engine (never the model) inside the authorizing decision entry; minting/inheritance rules: fresh LTID relation `first`; lineage.continues with mandatory causeRef (seq) relation `respawn`; amend never changes LTID; ladder rung attempts inherit relation `rung-retry`; unpark-restart; decompose children get FRESH LTIDs relation `decompose-child` with ancestry chain bounded by maxDepth while the decomposition itself consumes the parent's escalation counter; reuse links continue the donor LTID; LTID never enters the content key (identity untouched); pure folds attemptsUsed / escalationsUsed (only authoritative decision entries with countsAgainstLimit true) / stallStreak (suffix over attempt outcomes with transient/environment classes skipped, ok resets, escalated neutral); `approachSigCoarse` = sha256 canonical JSON {sigVersion, agentType, toolsetHash, schemaHash, isolation}; `approachSig` = sha256 {sigVersion, coarse, approachTag} with tag normalization (NFC, lowercase, non-alphanumerics to hyphen, 32 chars, empty -> 'default'); prompt prose never in the signature; optional approachVocabulary rejection with bounded re-prompt; LineageStats rendering pinned to wake snapshots; limits maxEscalationsPerLogicalTask (default 2; old name maxEscalationsPerNode rejected by the config validator with a migration hint) and maxAttemptsPerLogicalTask (default 8), monotonically consumed; single-live-attempt invariant (`lineage_busy`); legacy journals canonize to deterministic `legacy:`-prefixed LTIDs (contentHash-derived, relation first), never random ULIDs on replay; request/value split inside decision entries (proposed inputs hash; computed values reused on replay byte-exact).
- Inputs: docs/03 section "Lineage (DEF-3)"; docs/07 section "Lineage"; FR-0xx, FR-3xx; DEF-3.
- Deliverables: `LogicalTaskId`, `LineageRelation`, `LineageRef`, `LineageStats`, `AttemptOutcomeClass`, signature functions, `SpawnLineageOpt`, `approach` spawn option.
- Acceptance: reworded prompts with identical coarse inputs collide by construction; replay reads minted LTIDs from entries, never re-mints.
- Tests: DEF-3 cassette set (respawn-preserves-counter, rung-retry-lineage, decompose-mints-children, reworded-lessons-collide, stall-streak-classes-and-pinning, legacy-journal-resume).
- Depends on: M7-T01.

#### M7-T03 TerminationAccount and the termination lemma (DEF-2)

- Package: `@lurker/core` (`src/journal/termination.ts`).
- Build: debit-only `TerminationAccount` with the frozen limits vector written as `termination.init` at PlanRunner admission (V0 maxRevisionsPerRun default 32; S0 maxTotalSpawns default 128; E0 maxEscalationsPerLogicalTask default 2 per lineage; D0 maxDepth; kMax from the profile-registry snapshot; B0 run budget ceiling immutable after start, no API including HITL can top up; orchestratorCapUsd and finalizeReserveUsd per DEF-7); ordering: termination.init strictly BEFORE orchestrator_budget_reserve, reserve values must match init or reference it by seq; debit rules per resource (plan_revise -1 revision unit regardless of op count, verdict, or rebase outcome; admitted spawn of any origin -1 spawn unit; ladder rung raise -1 rung per lineage, rungIndex strictly monotonic; escalation decision with countsAgainstLimit true -1 escalation unit per affected lineage including class-level arrays and timeout defaultDecisions; depth checked at admit; dollars via the three existing layers); every debit atomic with its carrying decision entry and embedding balance-after; underflow writes `termination.denied` strictly before surfacing the typed error, mapped to non-HITL terminating fallbacks; Phi variant function and integrity check (replay-strict recomputes the debit fold from termination.init and asserts against embedded balances; divergence is a journal-integrity error at the exact entry); config drift on resume emits `termination:config-drift`, journal always wins; ladder longer than frozen kMax rejects with `ladder_exceeds_frozen`; profile with old limit name rejected by validator.
- Inputs: docs/07 section "TerminationAccount and the termination lemma (DEF-2)"; FR-3xx; DEF-2; XF-07 (cap fields in the vector).
- Deliverables: `TerminationLimits`, `TerminationAccount`, `TerminationAccountSnapshot`, `DebitResult`, `TerminationResource`, termination events.
- Acceptance: no credit operation exists anywhere (API-shape assertion); every debit path embeds balance-after; denied paths re-issue from the journal on replay with zero live calls.
- Tests: DEF-2 cassette set (revision-exhaustion, combined-loop-descent, config-drift-resume, class-storm-single-turn, oscillation-bounded, race-timeout-vs-live); property test: Phi strictly decreases on every debiting entry.
- Depends on: M7-T02 (hard dependency: lineage folds supply the lemma's per-lineage resources).

#### M7-T04 plan.revision, plan.decision, and the rebase algorithm (DEF-8)

- Package: `@lurker/plan` (`src/rebase.ts`, `src/plan-entries.ts`).
- Build: kind `plan.revision` (orchestrator-authored; fields base {digestSeq, planHash}, requestedOps, outcomes same length and order, assignedNodeIds, embedded admissions, planHashBefore/After, hashVersion, rationale; content key = sha256 {kind, base, requestedOps}, rationale excluded) and kind `plan.decision` (engine-authored on the fold head under PlanWriteLock, no rebase by construction; closed EnginePlanOp set: set_node_status with causes child-result|no-progress|park-landed|cancel-landed, resolve_escalation with resolvedBy default|class|live|revision-transform, spawn_admitted; dependency satisfaction is derived in the fold, never a record); the committed rebase algorithm: lock; validate base against the recorded WakeDigest pair (mismatch = ONE all-dropped `bad_base` revision entry, planHashAfter == planHashBefore); evaluate conflicts ONLY against the fold head; apply requested ops sequentially, each against the state already changed by prior applied ops of the same revision; per-op outcome applied | transformed (deterministic rewrite recorded beside the requested form) | dropped (journaled nop with machine reason and blockingRef); single durable append strictly BEFORE any effect; tool result rendered deterministically from the entry; the complete per-op conflict table exactly per docs/07 (add_task/amend_task/park_task/unpark_task/cancel_task/reprioritize/rewire_deps/waive_dep with all reason codes: admission_denied, node_already_done, dep_already_resolved, node_escalated, node_running, terminal_status, dep_cycle, already_parked, not_parked, no_such_dep, already_waived, bad_base, lineage_exhausted, lineage_busy, plan_frozen, and transform codes checkpoint_discarded, reuse_by_reference, resolved_escalation, immediate_satisfaction); cancel cascades computed at apply time into appliedOp.cascadeNodeIds with abandon entries for uncompleted subtree records (done nodes excluded, done is immutable); the timer-race rule: a late defaultDecision timer MUST append via the ResolutionArbiter and classify noop (resolution closes the suspended entry first, then plan.decision references it by seq); replay consumes the recorded outcomes, never re-runs rebase; replay-time planHashAfter verification raises `ReplayPlanHashMismatch` (typed refusal, journal not corrupted further).
- Inputs: docs/07 section "PlanRunner (DEF-8)" (rebase table, entry schemas); FR-3xx; DEF-8; XF-05, XF-08.
- Deliverables: `PlanReviseRequest`, `PlanReviseResult` (outcomes, assignedNodeIds, planHashAfter, droppedAll, revisionUnitsRemaining), `RebaseOutcome`, `RebaseReasonCode`, `EnginePlanOp`, `PlanInvariantError`, `ReplayPlanHashMismatch`.
- Acceptance: every row of the conflict table is exercised by a test; intra-revision self-conflicts resolve sequentially; the applied (not requested) diff replays.
- Tests: DEF-8 cassette set (revise-racing-defaultDecision, crash-after-append-before-effects, amend-vs-running-then-cancel-add, intra-revision-self-conflict, bad-base-streak-terminates, park-races-child-completion); table-driven unit matrix.
- Depends on: M7-T01, M7-T03.

#### M7-T05 PlanRunner scheduling and toolset

- Package: `@lurker/plan` (`src/plan-runner.ts`, `src/tools.ts`).
- Build: PlanRunner as the opt-in extension of mode (c): the engine, not the model, schedules ready nodes through the existing semaphore and admission; children under `plan/NodeId` scopes; `plan_view` as a pure fold of plan-scope entries pinned to coversToOrdinal of the last WakeDigest (never a live read), rendering LineageStats, abandoned-spend, and the TerminationAccount snapshot; `plan_revise` tool wired to M7-T04; quiescence trigger completed (nothing running and nothing ready); `finish` with result schema; normative JSON Schema for every orchestrator tool per docs/07; PlanRunner-only applicability switches (termination.init written; kb_pinned arrives M10).
- Inputs: docs/07 sections "Scope and applicability per mode", "PlanRunner", "Orchestrator toolset"; FR-3xx; DEF-8.
- Deliverables: `PlanRunner`, `PlanRunnerOptions` (maxRevisionsPerRun), tool schemas.
- Acceptance: revise-mid-run cassette green; plan_view bytes pinned (a re-executed wake turn reads its original snapshot).
- Tests: round-2 cassettes revise-mid-run, crash-during-revision.
- Depends on: M7-T04.

#### M7-T06 RevisionGuards, oscillation detector, hysteresis

- Package: `@lurker/plan` (`src/guards.ts`).
- Build: RevisionGuards with non-HITL terminating fallbacks (reject-revision -> finish-with-partial -> fail-run, terminating default); droppedRevisionStreak with droppedRevisionLimit default 3 consecutive all-dropped revisions; oscillation detector keyed by approachSigCoarse ACROSS LTID boundaries plus osc_guard by SpawnKey; hysteresis on nearly-done nodes; bounded stall replan (hard per-run cap, transient and environment error classes excluded).
- Inputs: docs/07 section "PlanRunner" (guards); FR-3xx; DEF-2/DEF-5 interactions.
- Deliverables: guard implementations, `RevisionGuardsOptions`.
- Acceptance: bad-base-streak-terminates and oscillation-freeze cassettes green; every guard verdict is a decision entry written before effects.
- Tests: the named cassettes; unit streak tests.
- Depends on: M7-T05.

#### M7-T07 Reuse-by-reference (DEF-5)

- Package: `@lurker/core` (`src/journal/reuse.ts`), `@lurker/plan` (admission integration).
- Build: `SpawnKey` = the kernel contentHash of the spawn root entry (no new hash concept; strict byte equality, no fuzzy matching); `DedupIndex` as a pure fold computed against the fold HEAD at revision-apply time under PlanWriteLock (base validates only); donor rules (root covered by a severing abandon; effective pre-abandon status not error, memoized failures excluded to invalidate/retry; not exclusively claimed by an earlier link, first-wins; live and done nodes not covered by abandon are never donors); the four admit outcomes embedded in the carrying decision entry: reuse_full (donor root ok or escalated; zero live reserve; extended per XF to carry spawnUnitsAfter and lineage), admit_graft (donor interrupted with at least one completed paid entry AND graft safe: isolation none/readonly always, worktree only when pinned via retainWorktree under the shared pin cap; full standard reserve, exclusive claim), fresh admit with DedupNote (donor_failed | no_paid_entries | graft_unsafe | donor_active), reject osc_guard at maxOscillationsPerKey (default 2); `node.link` as an ordinary forward-matched content-keyed effect entry (NOT a ref-entry; identity {kind, spawnKey, donorScope, targetNodeId}; only the donor is addressed by seq) establishing scope-prefix aliasing so per-scope cursors give partial subtree reuse free at any depth; the alias column of the predicate activates (pre-abandon status match-eligible only under an incoming alias); chains drain oldest-first transitively, bounded by maxOscillationsPerKey; linked nodes inherit the donor LTID; write order: decision entry, then node.link, then child root entry (full: written terminal ok with payload byRef and zero usage; graft: normal two-phase running), then scheduling; abandoned-spend ledger fold (abandonedUsd, reclaimedUsd from reclaimedUsdAtLink, netLostUsd, oscillationCount per SpawnKey and per run) visible in WakeDigest and events (node:linked, guard:oscillation); reclaim never credits budgets, revision units, or oscillation counters; opt-outs reuse.enabled false and per-op fresh: true embedded in the decision entry; cross-version donors matched by projecting the candidate DOWN under the donor entry's profile, incomparable = invisible donor.
- Inputs: docs/03 section "Abandon, derived skipped, and reuse-by-reference (DEF-5)"; docs/07 section "AdmissionController"; FR-0xx, FR-3xx; DEF-5; XF-06, XF-12.
- Deliverables: `SpawnKey`, `DonorRef`, `GraftBoot`, `DedupNote`, `AdmissionConfig.reuse`, `NodeLinkEntry`, `AbandonedSpendView`, `AgentResultMeta.reusedFrom`.
- Acceptance: byte-identical re-add after cancel/abandon returns results by reference by default (the single intended visible-semantics change, documented); grafted subtrees replay completed siblings via alias and pay live for exactly the interrupted frontier.
- Tests: DEF-5 cassette set (oscillation-full-reuse, graft-partial-subtree, crash-between-link-and-root, oscillation-guard-trip, worktree-disposed-degrade, claim-exclusivity-and-chain).
- Depends on: M7-T02, M6-T06, M2-T07.

#### M7-T08 Park and unpark

- Package: `@lurker/plan` (`src/park.ts`).
- Build: park/unpark preserving the child's transcript checkpoint; worktree-isolated parked nodes either pin the worktree under maxPinnedWorktrees (default 4, shared with retainWorktree) or unpark restarts the agent (silent resume against a fresh tree is impossible); overflow behavior: park keeps the checkpoint but drops the worktree (unpark becomes restart) and graft degrades to fresh admit with DedupNote graft_unsafe; unpark takes an embedded admission reserve; unpark-restart is a lineage attempt (relation unpark-restart).
- Inputs: docs/03 section "Checkpoints"; docs/08 section "IsolationProvider and worktree lifecycle" (pin cap); docs/07 conflict table rows; FR-3xx; DEF-5 interaction.
- Deliverables: park/unpark implementation.
- Acceptance: park-unpark cassette green including the pin-cap overflow path.
- Tests: round-2 park-unpark cassette.
- Depends on: M7-T05, M7-T07.

#### M7-T09 RunLedger

- Package: `@lurker/plan` (`src/ledger.ts`).
- Build: run-scoped, single-writer (orchestrator scope only), journaled, advisory ledger; closed authored `LedgerOp` union brief_set (once) | fact_add | fact_supersede | lesson_add (key mandatory pair logicalTaskId + approachSig) | observation_add, each a kind `ledger.op` effect entry; auto-derived sections as fold joins (revision history, TaskDigests ordered by spawn ordinal, world-delta index from artifacts), never authored ops; per-section caps as named config with defaults in docs/06 Appendix A (facts 64, lessons 32, observations 16); render joins the journal task table, journal always wins on what is paid and completed, discrepancies rendered flagged, never as truth; ledger_read pinned to the turn snapshot; no fold-global counters in the transcript; distillation lives in the child scope by taskId; `LedgerExport` draft-versioned JSON seam (OQ, docs/14); orchestrate-role aggressive compaction gated on measured ledger sufficiency, else conservative summarize fallback; renderBudget via the deterministic interim measure.
- Inputs: docs/07 section "RunLedger"; FR-3xx; DEF-3 (lesson keys).
- Deliverables: `LedgerOp`, ledger fold and renderer, `LedgerExport`.
- Acceptance: a lesson_add whose key matches no journaled attempt rejects; ledger view identical live and replay.
- Tests: unit fold tests; ledger-ops-per-spawn metric wiring test.
- Depends on: M7-T05.

#### M7-T10 ModelLadder full

- Package: `@lurker/plan` (`src/ladder.ts`), `@lurker/core` (router integration).
- Build: `LadderSpec { rungs: { model, effort?, maxTurns, maxTokens, maxCostUsd? }[], startTier, escalateOn: TriggerClass[], acceptance?: Gate[] }` resolving through the existing chain; typed transition triggers error | limit | schema-exhausted | verify-failed | no-progress; acceptance gates per attempt: mechanical (named engine-registered pure function over AgentResult.artifacts, verdict journaled as a decision entry), judge (declared rung with index >= executing rung, or explicit override; no cross-adapter quality ordering), spot-check (fraction via ctx.random, never Math.random); each rung attempt is an ordinary agent scope whose hash includes the concrete ModelRef (tier N+1 = new content key = one live attempt); all rung attempts share the LTID (relation rung-retry); every ladder control-flow verdict is a decision entry computed once live and replayed by match; per-rung cap hits and no-progress journal as the first-class terminal class; memoizeOutcome as opt-in flag on rung/fallback spawns; orchestrator never names models (model_hint.startTier clamped to the declared ladder).
- Inputs: docs/07 section "ModelLadder"; docs/04 section "ModelLadder summary"; FR-1xx, FR-3xx; DEF-2 (rung debits), DEF-3 (lineage).
- Deliverables: `LadderSpec`, `Gate`, ladder execution, mechanical-profile registry.
- Acceptance: half-escalated-ladder and budget-denied-rung cassettes green; ladder folds consume only journaled values.
- Tests: round-2 cassettes half-escalated-ladder, budget-denied-rung; unit gate tests.
- Depends on: M7-T03, M7-T02.

#### M7-T11 EscalationProtocol completion

- Package: `@lurker/plan` (`src/escalation.ts`), `@lurker/core` (decision plumbing).
- Build: complete the protocol over the M3 base: `EscalationDecision` union retry | decompose | cancel | accept with countsAgainstLimit derivation; `EscalationOptions { flavor, deadlineMs, defaultDecision, minSpendUsd default 0 }`; class-level decisions (one decision entry with an array of per-lineage debits; one coordinated storm costs one expensive turn; correlation key is OQ, docs/14); decide-once via the resolution family (timeout defaultDecision and live decision never both apply; loser journals as noop); maxEscalationsPerLogicalTask counted over authoritative decision entries with countsAgainstLimit true through lineage chains; cap excess yields terminal escalated with capExceeded flag and a final report (never a bare limit); under plan/NodeId reports route into WakeDigest; decision entries embed admit verdicts and reserves for decompositions.
- Inputs: docs/07 section "EscalationProtocol"; FR-3xx; DEF-1/2/3/4 interactions.
- Deliverables: `EscalationDecision`, `EscalationOptions`, class-decision machinery.
- Acceptance: class-storm-single-turn and race-timeout-vs-live cassettes green; capExceeded path returns the report.
- Tests: named cassettes; unit decision-derivation tests.
- Depends on: M7-T03, M7-T05.

#### M7-T12 Orchestrator cap and finalize reserve (DEF-7)

- Package: `@lurker/plan` (`src/orchestrator-budget.ts`), `@lurker/core` (CostReport delta).
- Build: orchestrator sub-account beside plan/NodeId accounts (all orchestrate-role turns, including bounded re-prompt and its own compaction; plan_view/ledger_read/WakeDigest assembly are pure folds costing nothing; TaskDigest distillation bills the child); effectiveCapUsd = min(capUsd, capFraction * runCeilingUsd), capFraction default 0.2; `OrchestratorCapConfigError` before the first LLM call when the cap is unresolvable or effectiveCap < finalizeReserve, on BOTH surfaces (orchestrate and ctx.orchestrate; nested instances clamp under the parent remainder minus the parent finalizeReserve); decision entry `orchestrator_budget_reserve` strictly AFTER termination.init and strictly BEFORE the first orchestrator agent entry, freezing capUsd and finalizeReserveUsd (explicit, or finalizeTurns default 2 times the priced turn estimate) as absolute dollars registered as committedReserve in both the orchestrator and root accounts (admission never eats finalization money); reserve-floor generalized: every parent account created at decomposition gets a finalizeReserve and childBudgetFraction computes net of it; enforcement through the three existing layers (pre-wake soft-boundary check forcing finish, per-turn guard, hard AbortSignal at effectiveCap); at-cap protocol via one `orchestrator_budget_cap` decision entry strictly before effects (plan frozen for adaptation not work; admitted nodes finish; wake triggers except quiescence and run-abort disarmed; suspended Flavor B escalations resolved by journaled defaultDecision referencing the cap decision; in-flight PlanOps against pre-cap snapshots drop with reason plan_frozen); final quiescence wake paid from the reserve with a one-tool finish toolset (distinct toolsetHash deterministically derived from the journaled cap decision) and finalizeTurns limit; ok outcome with forcedFinish mark; on finish failure `orchestrator_finalize_fallback` synthesizes a deterministic partial result by pure fold (plan state, TaskDigests, ledger render; zero LLM calls; outcome exhausted with non-null value); WakeBudgetBlock in every WakeDigest (runSpent, orchestratorSpent, cap, reserve, orchestratorShare, softWarning at 80 percent; no self-budget wake trigger); CostReport gains byRole and the orchestrator block { spentUsd, share, wakes, forcedFinish, reserveUsedUsd }; `orchestrator:budget` telemetry at every wake boundary and at cap; H-OrchShare hypothesis metrics (orchestrator-share p50/p90 with slices) wired for dogfood; capFraction default revisited against measured p90 (hypothesis registry, docs/01 section "Hypotheses").
- Inputs: docs/07 section "Orchestrator budget (DEF-7)"; docs/09 section "Metrics"; FR-3xx, FR-5xx; DEF-7; XF-07.
- Deliverables: `OrchestratorBudgetSpec`, `WakeBudgetBlock`, cap/reserve/fallback decision payloads, `OrchestratorCapConfigError`, CostReport delta.
- Acceptance: DEF-7 cassettes (minus the queue one) green; reserve survives run exhaustion; fallback value identical live vs replay.
- Tests: cap-freeze-then-finish, crash-between-cap-and-effects, reserve-survives-run-exhaustion, finalize-fallback-synthesized, escalation-storm-frozen.
- Depends on: M7-T03, M7-T05, M7-T11.

#### M7-T13 WakeDigest final coordinated schema

- Package: `@lurker/plan` (`src/wake-digest.ts`).
- Build: the final normative WakeDigest in ONE coordinated schema change (all deltas together, inside the already-frozen hash-v2 identity rules): digestSeq, planHash, coversToOrdinal, completedDigests: TaskDigest[], escalations, termination snapshot (mandatory), budget block, reuse stats; coalescing rules; renderBudget deterministic interim measure with the tokenizer question tracked as OQ.
- Inputs: docs/07 section "WakeDigest"; FR-3xx; XF-08.
- Deliverables: final `WakeDigest` type and renderer.
- Acceptance: digest schema validates all cassette digests; pinning semantics hold post-crash.
- Tests: schema tests; re-executed-wake pinning test.
- Depends on: M7-T12.

#### M7-T14 M7 cassette recording and metric wiring

- Package: repo `cassettes/`, `@lurker/plan`.
- Build: record all M7 gating cassettes (section 2.1); wire remaining metrics (ledger-ops-per-spawn, wake-render-size, escalation rate by agentType, abandoned/reclaimed/netLost USD) into the event stream.
- Inputs: docs/09 sections "Metrics", "Mandatory defect cassette catalog".
- Deliverables: cassettes; metric events.
- Acceptance: M7 gate green in one CI run.
- Tests: the cassettes.
- Depends on: M7-T06, M7-T07, M7-T08, M7-T09, M7-T10, M7-T13.

### 3.9 M8, v0.9.0: server and queue

Goal: the multi-process shells: HTTP server with SSE and external resolution, queue worker with leasing and fencing, seam soak.

Entry criteria: M7 released; `@lurker/store-sqlite` conformant; every docs/06 Appendix A knob marked "TBD before M8" (lease ttl, createWorker concurrency) committed by a docs amendment.

Exit criteria: queue-failover-during-forced-finish cassette green; a two-worker soak run over SqliteStore shows zero split-brain and zero double pay; v0.9.0 released.

#### M8-T01 createServer

- Package: `@lurker/cli` (`src/server.ts`).
- Build: `createServer({ engine, workflows })` (the canonical signature; docs/02 section "Shells overview" and docs/06 section "Workflow registry for shells"; the journal store comes from the engine) returning `{ fetch(req): Promise<Response> }` with routes POST /runs, GET /runs/:id, GET /runs/:id/events (SSE; reconnection via Last-Event-ID mapped to event seq per the docs/14 interim rule), POST /runs/:id/external/:key (programmatic resolution maps to `by: 'external'`), GET /runs/:id/cost; auth explicitly out of scope (host middleware).
- Inputs: docs/02 section "Shells overview"; docs/06 section "Engine and ops API" (workflow registry); docs/14 OQs (server auth, SSE); FR-7xx.
- Deliverables: `createServer`.
- Acceptance: HITL round-trip over HTTP (suspend, resolve via endpoint, resume) works; SSE resume replays missed events from seq.
- Tests: server e2e tests with fetch.
- Depends on: M7 complete.

#### M8-T02 createWorker

- Package: `@lurker/cli` (`src/worker.ts`).
- Build: `createWorker(engine, { store: LeasableStore, concurrency? })`: leases resumable and suspended runs via acquire/renew/release with fencing epochs; hashVersion compatibility check at acquire (a worker on an older library cannot write into a newer journal); stateless workers call engine.resume; a non-leasable store is a typed ConfigError at worker start; queue semantics honestly at-least-once with journal dedup; renew cadence at most ttl/3.
- Inputs: docs/03 section "Storage SPI" (lease contract); docs/02 section "Shells overview"; FR-7xx, FR-0xx; DEF-6 (acquire check).
- Deliverables: `createWorker`.
- Acceptance: lease theft by fencing epoch is impossible (stale writer's appends rejected and invisible); acquire on held lease rejects with `LeaseHeldError`.
- Tests: two-process integration tests; conformance fencing suite re-run.
- Depends on: M8-T01.

#### M8-T03 Multi-process seam soak

- Package: repo `cassettes/`, CI.
- Build: soak scenario killing and failing over workers mid-run across suspension, forced finish, and plan revision boundaries; record queue-failover-during-forced-finish (DEF-7 final cassette); document queue-mode limitations (no distributed cross-process rate limiter; EXC pointer).
- Inputs: docs/11 section "Per-milestone exit criteria matrix"; DEF-7.
- Deliverables: soak harness, cassette.
- Acceptance: exactly one cap decision across failovers; finalization paid once.
- Tests: the soak and cassette.
- Depends on: M8-T02.

#### M8-T04 Redaction and retention decisions executed

- Package: `@lurker/core`, `@lurker/cli`.
- Build: execute the docs/14 interim rules that must hold before public server exposure: the planned L0 serialization hook (redact/encrypt at append/put boundaries, symmetric on load/get), default key-masking policy, OTel attribute content policy; retention: JournalStore.delete cascades transcript cleanup (engine-side over list(runId)), optional retention policy hooks in server/queue, checkpoint pruning after an agent's terminal entry. Scope strictly limited to the interim rules; the OQs stay open in docs/14 with this milestone as owner.
- Inputs: docs/09 section "Redaction and sensitive data"; docs/14 OQ register (redaction defaults; retention/GC and cascade delete); FR-0xx, FR-5xx, FR-7xx.
- Deliverables: serialization hook seam, masking default, cascade delete.
- Acceptance: key-shaped strings are masked in events/SSE/OTel by default; delete leaves no orphan transcripts.
- Tests: unit masking tests; delete-cascade test.
- Depends on: M8-T01.

### 3.10 M9, v1.0.0: ecosystem and freeze

Goal: long-tail ecosystem, the evals package, the complete cassette catalog, and the 1.0 SPI freeze with its release gates.

Entry criteria: M8 released; server/queue soak completed (seams exercised by shells).

Exit criteria: complete defect cassette catalog green in one CI run; six seams frozen with committed `.d.ts` baselines; license decided (replaces License: TBD); trademark clearance done; naming contingency resolved or consciously carried; v1.0.0 released.

#### M9-T01 @lurker/bridge-ai-sdk

- Package: `@lurker/bridge-ai-sdk` (`src/bridge.ts`).
- Build: wrap any Vercel AI SDK LanguageModelV4 (`@ai-sdk/provider` ^4) as a ProviderAdapter for the long tail (Google, Bedrock, Vertex); runtime specificationVersion check with a clear error on mismatch; documented as the highest-churn package and the likely driver of pre-1.0 BREAKING minors had it shipped earlier.
- Inputs: docs/04 section "@lurker/bridge-ai-sdk"; FR-1xx; risk register (churn watch).
- Deliverables: `bridgeAiSdk(model): ProviderAdapter`.
- Acceptance: a V4 model streams through the full ChatEvent vocabulary; wrong specificationVersion errors clearly.
- Tests: unit tests over a fake V4 model; live smoke (key-gated).
- Depends on: M4 complete.

#### M9-T02 @lurker/evals base

- Package: `@lurker/evals` (`src/case.ts`, `src/graders/`).
- Build: `EvalCase = { workflow, args, graders[] }`; golden-output, rubric, and LLM-judge graders; judge graders run THROUGH the engine with the judge role, so judge calls are journaled, budgeted, and VCR-recordable (deterministic eval CI); config-matrix comparison (profile vs profile, cheap workers vs premium, reviewer on/off) reporting pass-rate, cost, latency from existing AgentResult usage/costUsd; no failure clustering, no vector dependency.
- Inputs: docs/09 section "@lurker/evals"; FR-5xx.
- Deliverables: `EvalCase`, graders, matrix runner.
- Acceptance: an eval suite is fully deterministic under VCR replay.
- Tests: self-tests on FakeAdapter and VCR.
- Depends on: M5-T04.

#### M9-T03 Community adapter and store guides

- Package: docs, `@lurker/store-conformance`, `@lurker/testing`.
- Build: guides for community adapter authors (VCR-based contract tests, Usage invariant checklist, wire mapping requirements) and store authors (conformance kit walkthrough, SqliteStore as reference).
- Inputs: docs/03 section "Storage SPI"; docs/04 section "ProviderAdapter SPI"; FR-5xx.
- Deliverables: guide documents; templates.
- Acceptance: a third-party mock store built only from the guide passes conformance.
- Tests: dogfood exercise in review.
- Depends on: M9-T02.

#### M9-T04 Complete cassette catalog audit

- Package: repo `cassettes/`, CI.
- Build: audit the catalog against docs/09 (all DEF-1..DEF-8 sets, the round-2 set, and the M6/M8 substrate and soak set), including the live re-recordings required by the synthetic-fixture rule (section 2.1); fill gaps; wire production-journal replay (any dogfood journal replays as a deterministic integration test).
- Inputs: docs/09 section "Mandatory defect cassette catalog"; docs/11 sections "Replay-strict tier", "Per-milestone exit criteria matrix"; NFR determinism.
- Deliverables: complete green catalog job.
- Acceptance: one CI job runs every cassette strict with zero live calls.
- Tests: the catalog.
- Depends on: M8-T03.

#### M9-T05 SPI audit and freeze

- Package: all.
- Build: freeze the six seams after shell soak: ProviderAdapter; JournalStore plus LeasableStore (one seam); TranscriptStore; ScriptRunner; ToolSource; IsolationProvider (ModelKnowledgeStore freezes post-1.0 with KB phase 1; the event surface is RunHandle.events/on() public API, not an SPI); commit rolled-up `.d.ts` baselines as the drift gate (PR diffs reviewed; api-extractor only if formal reports prove necessary); resolve or explicitly carry every pre-1.0 OQ marked as a freeze blocker in docs/14.
- Inputs: docs/02 section "SPI seams and the 1.0 freeze"; docs/12 section "The 1.0 gate"; docs/13 (drift gate); NFR compatibility window.
- Deliverables: frozen baselines; freeze note in docs.
- Acceptance: CI fails on any unreviewed seam diff.
- Tests: drift-gate CI job.
- Depends on: M9-T04.

#### M9-T06 1.0 release gates (founder items)

- Package: none (decisions plus docs).
- Build: execute the gate checklist: license decided and applied repo-wide (License: TBD removed everywhere; never include license text in docs); formal trademark clearance (USPTO/EUIPO software classes); naming contingency resolved or consciously carried per docs/13; publish v1.0.0.
- Inputs: docs/12 section "The 1.0 gate"; docs/13 section "Naming risk note"; docs/14 founder decisions.
- Deliverables: updated legal/naming records; the release.
- Acceptance: all gate items checked in the release PR.
- Tests: docs lint (no remaining TBD placeholders).
- Depends on: M9-T05.

### 3.11 M10, v1.1.0: ModelKnowledge phase 1

Goal: the sanctioned cross-run memory exception, smallest safe slice: SPI with file default, human-editorial claims only, journal-pinned snapshots, tier-relative card. Without evals the verified layer is empty: no automatic tier steering exists, notes are honestly marked unverified.

Entry criteria: v1.0.0 shipped; docs/05 frozen; the taskClass binding OQ resolved (phase-1 blocker, docs/14).

Exit criteria: kb_pinned/kb_repinned appear in orchestrate-role runs and replay from entry bytes without touching the live store; v1.1.0 released.

#### M10-T01 ModelKnowledgeStore SPI and file store

- Package: `@lurker/core` (`src/l0/spi/knowledge.ts`, `src/knowledge/file-store.ts`).
- Build: `ModelKnowledgeStore { current(): Promise<KnowledgeSnapshot>; commit(ops, expectedVersion): Promise<number> }` with CAS by monotonic version (mirroring lease fencing discipline); the runtime handle is `Pick<..., 'current'>` only; NO propose method exists in the SPI; default file store `./lurker.models.json`, git-diffable, serverless; engine-scoped, global only by explicit store passing.
- Inputs: docs/05 sections "Feature boundary", "Data model"; FR-6xx.
- Deliverables: SPI, `FileModelKnowledgeStore`, `KnowledgeSnapshot`.
- Acceptance: concurrent commits serialize by CAS failure and rebase; runtime handle shape verified by type test.
- Tests: unit CAS tests; type tests.
- Depends on: M9 complete.

#### M10-T02 Claim data model (editorial path)

- Package: `@lurker/core` (`src/knowledge/claims.ts`).
- Build: `ModelClaim` (subject {model, effort?}, taskClass aligned with the role-floor vocabulary, polarity, statement <= 200 chars, class human-editorial (eval-measured schema present but committable only from M11), status, evidence >= 1 with `EvidenceRef.entryRef` as seq number, confidence, observedAt, expiresAt, modelEpoch?, author, origin?, supersedes; append-only: edit = new claim + supersede); `GateRecord` human variant with mandatory attribution attestation (ruledOut checklist: prompt, tools, difficulty, transient-provider; recommended contrastEvidence; without attribution the ClaimOp does not construct); eval-confirmed reserved for v2, outside the map; `ClaimOp` add/supersede/archive; active-claims cap per (model, taskClass) default 8 with supersede chains keeping only the head active.
- Inputs: docs/05 section "Data model"; FR-6xx; XF ruling (entryRef as seq).
- Deliverables: claim types, validators.
- Acceptance: constructing a gated op without attestation is a type and runtime error; caps enforced at commit.
- Tests: unit schema tests.
- Depends on: M10-T01.

#### M10-T03 Read path: kb_pinned/kb_repinned and the card

- Package: `@lurker/core` (`src/knowledge/card.ts`, engine integration).
- Build: one read at run admission before the first orchestrator turn (only for runs resolving an orchestrate-role invocation): filter claims (active, unexpired, models reachable through the run's declared ladders after floor filtering) and render `modelKnowledgeCard(snapshot, ladders, floors)` as a deterministic pure function; decision entries kb_pinned / kb_repinned with the card bytes embedded (replay and resume read entry bytes, never the live store; a mid-run commit affects only later pins); repin on EVERY resume from suspension (wait_for_events, HITL approvals, awaitExternal); two-layer tier-relative card: verified layer compiled ONLY from eval-measured claims (empty in phase 1) with the one-rung clamp; editorial notes rendered tier-relative, dated, explicitly marked "editorial note, no metrics, not confirmed by evals", never compiled into a tier; orchestrator never sees model names; AdmissionController and child spawns read the latest pin of their scope in spawn order, never wall-clock.
- Inputs: docs/05 sections "Read path", "Security", "Composition with the model layer"; FR-6xx; invariant I2.
- Deliverables: card renderer, pin/repin entries.
- Acceptance: replay of a run whose store has since changed uses the pinned bytes; card text deterministic per snapshot.
- Tests: unit render tests; pin-replay cassette; multi-day-suspension repin test.
- Depends on: M10-T02.

#### M10-T04 lurker kb list

- Package: `@lurker/cli` (`src/commands/kb.ts`).
- Build: `lurker kb list` showing claims with full provenance for ladder/floor/profile authors (the second consumption path).
- Inputs: docs/05 section "Read path"; FR-7xx, FR-6xx.
- Deliverables: CLI command.
- Acceptance: provenance (author, gate, evidence refs, TTL state) rendered per claim.
- Tests: CLI e2e on a fixture store.
- Depends on: M10-T03.

#### M10-T05 taskClass binding interim rule

- Package: `@lurker/core`.
- Build: optional `taskClass` field on AgentProfile and TaskSpec defaulting to `unclassified`, in which case card recommendations do not apply; the OQ record in docs/14 updated with the phase-1 resolution.
- Inputs: docs/05 section "Phases and placement"; docs/14 OQ (taskClass binding, phase-1 blocker); FR-6xx.
- Deliverables: field plumbing; docs update.
- Acceptance: unclassified spawns ignore card recommendations entirely.
- Tests: unit tests.
- Depends on: M10-T03.

### 3.12 M11, v1.2.0: ModelKnowledge phase 2

Goal: measurement: eval-measured claims via committer identity, matrix sweeps, TTL/staleness, canary fingerprint, falsification sweeps.

Entry criteria: v1.1.0 shipped; phase-1 dogfood telemetry collected.

Exit criteria: an eval sweep produces committable eval-measured claims; expired claims stop steering after repin; v1.2.0 released.

#### M11-T01 Eval-committer identity and eval-measured claims

- Package: `@lurker/core`, `@lurker/evals`.
- Build: metrics block (passRate, n, graderId, cost?, baseline?) writable ONLY by the eval-committer identity (schema-enforced); observational data never carries metrics and never auto-promotes.
- Inputs: docs/05 sections "Data model", "Grounding and decay", "Security" (channel break 4); FR-6xx.
- Deliverables: committer identity plumbing, claim class activation.
- Acceptance: a human-authored op with metrics rejects; the eval pipeline commit succeeds.
- Tests: unit authorization tests.
- Depends on: M10 complete.

#### M11-T02 Matrix sweeps

- Package: `@lurker/evals` (`src/sweeps.ts`).
- Build: matrix sweeps (workflow x model x taskClass) over current routing beliefs, emitting eval-measured claims through the committer identity; sweeps run through the ordinary engine (journaled, VCR-recordable, budgeted); sweep volume never authorized by proposal volume (fixed pools only).
- Inputs: docs/05 section "Grounding and decay"; docs/09 section "@lurker/evals"; FR-5xx, FR-6xx.
- Deliverables: sweep runner.
- Acceptance: a sweep is replayable under VCR and its claims carry EvidenceRef eval reports.
- Tests: sweep e2e under VCR.
- Depends on: M11-T01.

#### M11-T03 TTL and staleness

- Package: `@lurker/core` (`src/knowledge/decay.ts`).
- Build: asymmetric TTLs (eval strength 90d, eval weakness 30d, editorial strength 120d, editorial weakness 45d; inbox 14d reserved for M12); expiry enforced at every pin AND repin; expired eval claims enter the re-measure queue (a status filter, not infrastructure); archive, never delete (historical runs keep their audit).
- Inputs: docs/05 section "Grounding and decay"; FR-6xx.
- Deliverables: decay enforcement.
- Acceptance: an expired claim stops influencing the card at the next pin/repin.
- Tests: unit TTL tests with clock control.
- Depends on: M11-T01.

#### M11-T04 modelEpoch and canary fingerprint

- Package: `@lurker/core`, `@lurker/evals` (`src/canary.ts`).
- Build: modelEpoch as an honestly coarse signal (registry version, pricing version, caps hash; silent alias re-pointing documented as uncaught without probes); optional canary fingerprint (fixed probe set at temperature 0, hash of normalized outputs) run by maintenance command; fingerprint change flips the model's eval claims to stale immediately; canary design details tracked as OQ (docs/14).
- Inputs: docs/05 section "Grounding and decay"; FR-6xx.
- Deliverables: epoch capture, canary runner.
- Acceptance: fingerprint drift marks claims stale in one command.
- Tests: unit tests with a mutated fake model.
- Depends on: M11-T02.

#### M11-T05 lurker kb sweep

- Package: `@lurker/cli`.
- Build: `lurker kb sweep` (manual, CI, or user cron; never engine-scheduled): falsification sweeps that MUST include models with active negative claims; executed by the ordinary engine.
- Inputs: docs/05 section "Grounding and decay"; FR-7xx, FR-6xx.
- Deliverables: CLI command.
- Acceptance: a sweep over a store with negative claims includes those models in its matrix.
- Tests: CLI e2e under VCR.
- Depends on: M11-T02, M11-T03.

#### M11-T06 Verified-layer compilation

- Package: `@lurker/core` (`src/knowledge/card.ts` delta).
- Build: compile startTier recommendations per (ladder, taskClass) exclusively from eval-measured claims, clamped to at most one rung from the ladder's default entry (the cost of any false belief is bounded by one rung); floors and ModelCaps remain hard; budget touched only through the existing admission path.
- Inputs: docs/05 sections "Read path", "Composition with the model layer"; FR-6xx, FR-1xx.
- Deliverables: verified-layer compiler.
- Acceptance: no compiled recommendation ever exceeds one rung of displacement; editorial claims never compile.
- Tests: unit clamp tests; property test over random snapshots.
- Depends on: M11-T01, M11-T03.

### 3.13 M12, version unassigned, gated: ModelKnowledge phase 3

Goal: the proposal loop: kb_propose, modelObservations, inbox, human gate. This milestone is GATED: no task starts before the measured-value checkpoint passes, and its version is assigned only then.

Entry criteria (the gate): phases 1-2 demonstrate measured value: the card demonstrably improves tier and agentType selection on eval cases against the quantitative criteria recorded in docs/14 (OQ: phase-3 value-checkpoint criteria). The gate decision is journaled in docs (a dated amendment to docs/05 and docs/14).

Exit criteria: quarantine properties hold end to end (proposals influence no prompt in any run before gating); release under the assigned version.

#### M12-T01 Gate evaluation

- Package: none (evals plus docs).
- Build: run the checkpoint evaluation on eval cases; record pass/fail against the docs/14 criteria; on fail, M12 stays closed and the OQ gains the measured data.
- Inputs: docs/05 section "Phases and placement"; docs/14 OQ register.
- Deliverables: checkpoint report; docs amendment.
- Acceptance: an explicit recorded decision.
- Tests: the evaluation itself.
- Depends on: M11 complete.

#### M12-T02 kb_propose and modelObservations

- Package: `@lurker/plan`, `@lurker/core`.
- Build: optional `kb_propose` tool registered like escalate (opt-in on profile); schema-valid payload (subject, taskClass, polarity, trigger from the typed vocabulary error|limit|schema-exhausted|verify-failed|no-progress|escalation, statement assembled by template over that vocabulary so tool-output text is unquotable into persistence, evidence resolving only into THIS run's decision entries, note <= 200 chars never rendered into any prompt before gating); written as a journaled ledger.op into the RunLedger `modelObservations` section (orchestrator scope only; single-writer intact; workers contribute evidence only via their journaled ladder verdicts and TaskDigests); NO mirroring into the live store; absolute quarantine (proposals render into no prompt of any run, including the proposing orchestrator's later turns, until gated).
- Inputs: docs/05 sections "Write path", "Security"; FR-6xx, FR-3xx.
- Deliverables: `kb_propose` tool, `KbProposal`, ledger section.
- Acceptance: injected garbage in a proposal is inert (quarantine test); nothing commits during a run.
- Tests: quarantine cassettes; schema tests.
- Depends on: M12-T01.

#### M12-T03 Inbox via LedgerExport

- Package: `@lurker/cli`.
- Build: `lurker kb inbox` aggregating proposals from completed runs through the LedgerExport seam; groups matching (subject, taskClass, polarity) triples for DISPLAY only (grouping never authorizes spend or schedules sweeps); records the initiating run identity from metadata; inbox entries expire after 14 days.
- Inputs: docs/05 section "Write path"; FR-7xx, FR-6xx.
- Deliverables: CLI command.
- Acceptance: grouping is presentation-only (no side effects); provenance preserved.
- Tests: CLI e2e on fixture exports.
- Depends on: M12-T02.

#### M12-T04 Human gate flow

- Package: `@lurker/cli`, `@lurker/core`.
- Build: the gate flow turning an inbox proposal into a human-editorial claim: mandatory attribution attestation (ruledOut checklist, recommended contrastEvidence), origin provenance {kind: 'kb-proposal', runId, entryRef}, CAS commit; rubber-stamping is constructively impossible (GateRecord does not assemble without attestation).
- Inputs: docs/05 section "Write path"; FR-6xx.
- Deliverables: gate flow.
- Acceptance: an ungated proposal can never become a claim; gated claims carry origin.
- Tests: unit gate tests; e2e inbox-to-claim flow.
- Depends on: M12-T03.

## 4 Cross-milestone tracks

Six tracks let parallel implementers work without collisions. Each track owns directories; cross-track edits to `@lurker/core/src/l0/` (shared L0 contracts) require a docs amendment first and serialize through review.

| Track | Owns (directories) | Tasks |
|---|---|---|
| J: journal and durability | core/src/journal, core/src/stores, store-sqlite, store-conformance, compat | M1-T04, M2-T01..T07, M2-T11, M2-T12, M3-T02, M5-T02, M7-T02, M7-T03, M7-T07 |
| M: model layer | core/src/model, anthropic, openai, bridge-ai-sdk | M1-T01, M1-T05, M1-T12, M1-T13, M3-T06, M4-T01..T09, M9-T01 |
| E: execution and runtime | core/src/engine, core/src/runtime, core/src/runner, core/src/tools, planner | M1-T02, M1-T03, M1-T06..T11, M2-T08, M2-T09, M3-T01, M3-T03, M3-T04, M3-T05, M3-T07..T10, M5-T05..T07, M5-T10, M6-T01..T05, M6-T10 |
| A: adaptive orchestration | core/src/orchestrator, plan | M6-T06..T09, M7-T01, M7-T04..T06, M7-T08..T14 |
| K: knowledge | core/src/knowledge, evals (sweeps/canary), kb CLI commands | M10-T01..T05, M11-T01..T06, M12-T01..T04 |
| T: tooling, shells, docs | cli, testing, evals (base), eslint-plugin-lurker, examples, cassettes, repo infra, docs | M0-T01..T09, M1-T14, M1-T15, M2-T10, M3-T11, M5-T01, M5-T03, M5-T04, M5-T08, M5-T09, M6-T11, M8-T01..T04, M9-T02..T06 |

Collision rules: (1) the kinds registry, scope grammar, status vocabulary, and disposition tables are track J property and frozen after M2 (rule 1.4.3); (2) tool schemas of the orchestrator toolset are track A property from M6; (3) no track adds engine strategy semantics (EXC); (4) shells (track T) consume only public APIs, which is a standing seam-sufficiency test.

## 5 Post-1.0 track

The post-1.0 milestones are the ModelKnowledge phases, riding the same lockstep and cassette rules as the pre-1.0 line:

- M10 -> v1.1.0, ModelKnowledge phase 1 (section 3.11): ModelKnowledgeStore SPI with the file default, human-editorial claims only, kb_pinned/kb_repinned, the two-layer tier-relative card (verified layer empty without evals). Entry-gated on the taskClass binding OQ (phase-1 blocker, [docs/14-open-questions.md](14-open-questions.md)).
- M11 -> v1.2.0, ModelKnowledge phase 2 (section 3.12): eval-measured claims via the eval-committer identity, matrix sweeps, TTL/staleness, canary fingerprint, `lurker kb sweep`.
- M12, version unassigned and gated, ModelKnowledge phase 3 (section 3.13): kb_propose, the modelObservations ledger section, the inbox via LedgerExport, and the human gate; it starts ONLY after the phases 1-2 measured-value checkpoint passes against the quantitative criteria recorded in docs/14 (OQ: phase-3 value-checkpoint criteria). Runtime startTier promotion and the eval-confirmed auto-gate remain v2 candidates outside this plan (section 6).

Release cadence and the support statement for this track are owned by [docs/12-release-versioning.md](12-release-versioning.md), section "Post-1.0 cadence and support statement"; phase placement rationale is in [docs/05-model-knowledge-spec.md](05-model-knowledge-spec.md), section "Phases and placement".

## 6 Not in v1 (exclusions)

The EXC registry with rationale lives in [docs/01-requirements.md](01-requirements.md), section "EXC registry". No task in this plan implements, and no PR may introduce:

- continuous orchestrator monitoring (the orchestrator sleeps between wakes);
- whole-plan regeneration as a revision primitive;
- a fourth orchestration mode;
- allowChildSpawns (direct spawning by worker nodes);
- vector stores and cross-run memory, with ModelKnowledge (M10..M12, post-1.0) as the sole sanctioned exception;
- runtime startTier promotion (v2 candidate: deterministic promotion table compiled from kb_pinned bytes, eval-measured claims only);
- a graph/YAML execution core (TaskGraph JSON only as an optional constrained planner target);
- checkpoint-everything snapshot resume;
- handoffs, chat rooms, blackboard coordination (call-and-return only, invariant I3);
- engine-level strategy enums and flags (manager_workers, debate, requireReview and similar: prompt patterns, not runtime semantics);
- the eval-confirmed auto-gate and corroboration threshold (v2 candidates requiring principal authentication and a fixed rate-capped sweep budget pool);
- routing epsilon-exploration;
- a QuickJS runner (future plugin behind the ScriptRunner seam);
- a distributed cross-process rate limiter (documented queue-mode limitation).

## 7 External dependency and risk notes

| ID | Risk | Impact | Mitigation | Revisit trigger |
|---|---|---|---|---|
| R1 | MCP SDK v2 migration (v1 supported ~6 months after v2 ships) | M3 MCP bus rework | Pin `@modelcontextprotocol/sdk` ^1.29; the migration is the explicit post-M3 task M5-T10. ASSESSED AND DEFERRED at M5-T10 (2026-07-07): no v2 line is published (npm `latest` is 1.29.0, the highest version; zero 2.x releases), so migration is not actionable. The MCP ToolSource stays on ^1.29 with the M3-T04 suite green and journal shapes unchanged; the migration re-owns to **M8** and fires only on the revisit trigger. If v2 has not shipped stable by M8, M8 re-runs this assessment and re-defers with a new owning milestone, per the same rule. | MCP SDK v2 stable release |
| R2 | TypeScript 7 / tsgo GA | Compiler switch churn | tsconfig kept free of deprecated options; TS >=6.0 <8 range; mechanical upgrade planned | First milestone after tsgo GA (~Aug 2026) |
| R3 | @ai-sdk/provider major churn (V2 -> V3 -> V4 in ~18 months) | Bridge package breakage | Bridge deferred to M9; exact provider major pinned; runtime specificationVersion check; documented as highest-churn package | Any provider major release |
| R4 | Live contract-test and eval sweep budget (whose keys, what cap) | Cron contract tests and KB sweeps cannot run | Founder decision tracked in docs/14 (founder section); cron tests degrade to cassette-replay-only until funded | Before M5-T04 cron enablement |
| R5 | tsdown maturity | Build pipeline breakage | tsup-compatible config; documented fallback tsup or plain tsc | Any blocking tsdown defect |
| R6 | pnpm 11 OIDC publishing regression history | Failed releases | Pin known-good pnpm in the release workflow | Any publish failure |
| R7 | Naming contingency (unscoped `lurker` squatted; npm org unverified) | Umbrella name unavailable | M0-T07 claim attempt; fallbacks recorded (lurkerjs, lurker-ai, @lurker/lurker); docs never use bare `lurker` in installs | M9-T06 gate (resolve or consciously carry) |
| R8 | hashVersion freeze discipline (post-M2 identity change) | Forced v3 bump, compat work, fixture churn | Kinds/scope/status/effort all frozen in M2; frozen-fixture CI guard; bump discipline per docs/12 | Any proposed identity change |
| R9 | Provider surface drift (July 2026 Anthropic/OpenAI behaviors) | Adapter breakage in the field | Cron cassette contract tests (M5-T04); refreshCaps; adapters absorb quirks invisibly to core | Red cron run |
| R10 | DEF-2/DEF-3 coupling (termination lemma false without lineage) | Unsound termination accounting | Hard task dependency M7-T03 depends on M7-T02; merge order enforced in review | n/a (structural) |
| R11 | Turborepo lock-in concern | CI orchestration dependency | Thin removable layer; documented `pnpm -r run` fallback | Any blocking Turborepo issue |

Open engineering questions that gate specific tasks (PlanRunner-vs-phase-chaining threshold, class-decision correlation key, invalidate/retry boundary, renderBudget measure, canary design, phase-3 checkpoint criteria, taskClass binding, checkpoint blob format, LedgerExport schema, no-progress heuristic, server auth and SSE details, retention/GC, redaction defaults) are registered with owner milestones and decision triggers in [docs/14-open-questions.md](14-open-questions.md); tasks above implement the recorded interim rules and MUST NOT invent alternatives. Knobs recorded as "TBD before Mx" in docs/06 Appendix A are committed by a docs amendment to that table BEFORE the first task of Mx that consumes them begins (the corresponding milestone entry criteria enforce this), so no task ever has to invent a default.
