# @lurker/plan

## 0.9.0

### Minor Changes

- f920013: M8-T03: the multi-process seam soak and the queue-failover-during-forced-finish cassette (the DEF-7 final cassette; docs/09 sections 6.9 and 6.10; docs/10 section 3.9 exit criteria).

  - `@lurker/plan`: the public `runQueueFailoverDuringForcedFinish` cassette runner: worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, finalization is paid once. The LeasableStore is injected (`QueueFailoverDeps.makeStore`) so the package stays core-only; the replay test and the record script supply the reference SqliteStore.
  - `@lurker/cli`: the multi-process-fencing-soak harness: two workers over one SqliteStore file with kill/failover across the suspension, plan-revision, and forced-finish boundaries; every round asserts zero split-brain and zero double pay. Worker hardening: a failed renew now frees the concurrency slot immediately (a stale run whose landings all reject may never settle; fencing, not the stale process's cooperation, protects the journal).
  - Repo: `cassettes/queue-failover-during-forced-finish.json` recorded and frozen (double-run agreement; `scripts/record-m8-cassettes.mjs`); the queue-mode limitation stays documented (no distributed cross-process rate limiter, EXC-14/OQ-17).

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @lurker/core@0.9.0

## 0.8.0

### Minor Changes

- 85d55cf: The v0.8.0 BREAKING release notes (M7 adaptive orchestration full; the flagged BREAKING minor of the pre-1.0 convention, docs/12 registry).

  BREAKING: the unified `AdmitVerdict` union is extended with the reuse verdicts (`reuse_full`, `admit_graft`) and the new reject codes (`termination_exhausted`, `ladder_exceeds_frozen`, `lineage_exhausted`, `lineage_busy`, `osc_guard`) (DEF-5). How it fails: exhaustive switches over the verdict kind or reject code in custom shells and admission SPI extensions stop compiling. Migration: add branches for the new arms; reject-code switches should route unknown codes to their generic-denial path.

  BREAKING: reuse-by-reference is the DEFAULT (DEF-5). A byte-identical `add_task` after a cancel or abandon no longer re-executes the subtree: the result returns by reference (`reuse_full`) or continues from the paid prefix (`admit_graft`). How it fails: changed semantics; runs that relied on re-execution against a changed world observe referenced results instead. This is the only intentional change of visible semantics in the pre-1.0 line. Migration: set `reuse.enabled: false` on the admission config, or `fresh: true` on the specific `add_task`.

  BREAKING: the config key `maxEscalationsPerNode` is renamed to `maxEscalationsPerLogicalTask` (XF-10): escalations count per logical task across respawns via the lineage chain. How it fails: a typed `ConfigError` naming the new key rejects the old one. Migration: rename the key; the default stays 2.

  BREAKING: the plan-size-scaled revision budget option is removed without deprecation (DEF-2). `maxRevisionsPerRun` is an absolute, non-replenishable counter (default 32) debited by exactly 1 per journaled `plan_revise`; nothing increments it. How it fails: the removed option is rejected at config validation. Migration: size `maxRevisionsPerRun` directly.

  BREAKING: `plan_revise` result and error schemas widen (rebase outcomes, embedded admissions, `revisionUnitsRemaining`) and `WakeDigest` gains the MANDATORY `termination` field beside `planHash`, `budget`, and `reuse` (DEF-2/DEF-8). How it fails: schemaHash and toolsetHash of orchestrator scopes change, so VCR cassettes recorded over orchestrator turns invalidate. Migration: re-record affected cassettes; consumers of the digest type add the new mandatory blocks (all-zero outside PlanRunner).

  BREAKING: B0, the run budget ceiling, is immutable after start (DEF-2): no API, including HITL decisions, can top it up. How it fails: code that mutated the run budget mid-run or expected an HITL top-up hits a typed runtime error; overshoot stays bounded by one turn per in-flight agent. Migration: size the ceiling at start; use the orchestrator cap and the finalize reserve (DEF-7) for graceful degradation instead of top-ups.

  BREAKING: PlanRunner requires a resolvable orchestrator cap (DEF-7). `orchestratePlanned` with no run USD ceiling and no explicit `budget.capUsd`, or with `effectiveCap < finalizeReserve`, refuses to start with a typed `OrchestratorCapConfigError` before any LLM call. Migration: pass `budget: { capUsd }` (or run under a USD ceiling and rely on `capFraction`, default 0.2; up to 1.0 opts out explicitly with a telemetry warning).

- 712a28e: M7-T01: the plan scope substrate. `TaskPlan` as engine-owned typed data (docs/07 3.1): `PlanNode` with the exact canonical field list, the closed `PlanNodeStatus` machine with immutable terminal statuses (`done` is immutable by construction) enforced by `assertPlanTransition` raising the typed `PlanInvariantError`; pure derivations `depsSatisfied`, `recomputePlanReadiness` (dependency satisfaction is derived in the fold, never a record), and `wouldCreateDepCycle` for the rewire_deps atomicity rule. `planHash` (docs/07 3.4): sha256 over the RFC 8785 canonical projection of PlanState through the frozen hashVersion 2 deriver, nodes sorted by NodeId, deps sorted in the hash, plus the guard fold counters revisionCount and droppedRevisionStreak; `assertPlanHead` raises `PlanInvariantError` on a fold-head mismatch; golden hashes are frozen in tests. `PlanWriteLock` (docs/07 3.2, XF-07): the in-process FIFO mutex serializing ONLY plan-scope appends, never a substitute for the ResolutionArbiter. The single sequential scope constant `PLAN_SCOPE` is `'plan'`. The temporary `M0_SCAFFOLD` marker is removed now that the package's first real API has landed.
- c8d88e7: M7-T04: plan.revision, plan.decision, and the committed rebase algorithm (DEF-8). `task-spec.ts`: the typed `TaskSpec`/`TaskSpecPatch` of docs/07 4.1 with `promptSpecHashOf` and patch application. `plan-entries.ts`: the two plan-mutating entry payloads (`PlanRevisionValue` with base/requestedOps/outcomes/assignedNodeIds/admissions/planHash chain/rationale plus the DEF-2 extensions; `PlanDecisionValue` with the closed `EnginePlanOp` set), content keys per docs/07 3.3 (rationale never keys), and THE single applier `applyPlanEntry`: replay consumes recorded outcomes (the APPLIED diff), never re-runs rebase, verifies the planHash chain under each entry's own hashVersion and raises the typed `ReplayPlanHashMismatch` at the exact entry; bad_base entries leave the hashed state byte-identical while lengthening the guard-side streak (`effectiveDroppedStreak`); terminal set_node_status transitions extinguish pending park/cancel flags and record doneRefs for waive blockingRef. `rebase.ts`: the committed algorithm (base validation against the recorded WakeDigest pair, conflicts evaluated ONLY against the fold head, sequential intra-revision application, per-op applied | transformed | dropped with the complete closed conflict table and reason codes, engine-computed cancel cascades excluding done, embedded add/unpark admissions, lineage-at-head checks, the DEF-5 dedup transform hook, and the DEF-7 plan_frozen row). Every row of the conflict table is exercised by the table-driven test matrix; the revise-racing-defaultDecision cassette shape asserts the exact dropped trio with blockingRef.
- a41c20f: M7-T05: PlanRunner scheduling and toolset. Core gains the PUBLIC orchestrator extension seam (docs/02 section 4 seam-sufficiency: orchestration packages build exclusively from the public API): `OrchestrateOptions.extension` hosts an `OrchestratorExtension` with boot strictly before the orchestrator's first agent entry, extension tools appended to the mode (c) toolset, an activity hook running after every child settlement strictly before wake evaluation, quiescence participation (nothing running AND nothing ready), digest extras, wake observation, prompt lines, and an `OrchestratorExtensionIO` exposing total-order appends into extension-owned scopes, the journal snapshot, the single admission point, explicit-scope child dispatch through the ordinary ctx.agent path (plan/NodeId sub-accounts open beside the orchestrator account), settled lookups, cancel, ULID minting, and telemetry. `outputSchemaRef`/`toolsetRef` now RESOLVE against the new `defaults.schemas` and `defaults.toolsets` engine registries (unknown names stay typed tool errors); `TerminationAccount.bindDeniedWriter` binds I/O onto fold-rebuilt accounts. @lurker/plan ships `planRunner(options)` and `orchestratePlanned(engine, goal, opts)`: boot writes `termination.init` (frozen limits with kMax and the profile-registry snapshot hash) strictly before the first scheduling entry and binds the account into admission; plan_view renders the pinned pure fold (plan state, per-node LineageStats, the TerminationAccount snapshot) at the last delivered WakeDigest, with digestSeq 0 seeded as the empty-plan bootstrap snapshot; plan_revise (normative docs/07 4.7 schema) debits one revisionUnit per journaled revision (underflow writes termination.denied first), evaluates the committed rebase at the fold head, appends ONE plan.revision strictly before effects, schedules newly-ready nodes under plan/NodeId scopes, lands cancel requests, re-issues idempotently on re-executed turns (roll-forward), and emits plan:revised plus termination:debit; the engine (never the model) schedules ready nodes and journals ready-to-running and terminal transitions as plan.decision entries whose terminal transitions extinguish pending flags; quiescence completes (nothing running and nothing ready). The end-to-end revise-mid-run shape and a full crash-resume with zero live calls and no duplicate entries are covered by integration tests against the public engine API.
- 51b062a: M7-T06: RevisionGuards, the oscillation detector, and hysteresis (docs/07 3.8). New `guards.ts`: the non-HITL terminating guard state machine whose every verdict is a journaled decision entry (decisionType 'guard-verdict') written strictly BEFORE its effects, with replay rebuilding state from journaled verdicts. The droppedRevisionStreak detector consumes `effectiveDroppedStreak` (the hashed counter plus trailing bad_base entries) and fires the configured fallback (reject-revision | finish-with-partial | fail-run; default finish-with-partial, droppedRevisionLimit default 3) exactly once: further plan_revise calls are rejected with a typed tool error instructing a finish with the partial result, and the fourth revision after a three-bad-base streak journals nothing and debits nothing. The oscillation detector keys on approachSigCoarse ACROSS LogicalTaskId boundaries: a re-add after a severing cancel counts one oscillation, the per-key limit (2, the Appendix A osc_guard default) freezes the signature with a journaled verdict plus a guard:oscillation event, and frozen re-adds reject at admission with the embedded osc_guard verdict (dropped admission_denied in the revision entry); guard counters are fed from the plan fold itself, identically live and on replay, so freeze thresholds never shift across a resume (fired-but-unjournaled verdicts roll forward at boot, deduplicated by content key). Stall detection emits stall:detected per (lineage, streak) with the hard per-run stall replan cap journaling its own verdict; hysteresis stays structural (park/cancel against running nodes land only as boundary flags, so nearly-done children are never killed mid-turn). plan_view now renders the guards block (engaged fallback, frozen signatures, stall replans used).
- f4e70be: M7-T07: reuse-by-reference (DEF-5). Core: new `journal/reuse.ts` with the rich `DonorRef` (replacing the M6 seq placeholder inside the closed AdmitVerdict union), `GraftBoot`, `DedupNote`, `ReuseConfig`, `NodeLinkValue` and its content identity (`nodeLinkKey` over {kind, spawnKey, donorScope, targetNodeId}), the `DedupIndex` pure fold (severed roots become donor candidates when their pre-abandon effective status is not error, memoized failures excluded, exclusive claims resolve first-wins, plan-node scopes sweep their own branch payments, unpinned worktree donors degrade), `evaluateReuse` with the four-outcome verdict table (reuse_full | admit_graft | fresh-with-note | reject osc_guard at the link count), and the abandoned-spend ledger fold (abandonedUsd/reclaimedUsd/netLostUsd, per-key oscillation counts). The kernel matcher gains scope-prefix aliasing (docs/03 9.5): `registerAlias` merges donor-scope candidates into the target scope in journal order at every nested level, and the alias disposition bypasses the abandon overlay so donor entries regain their pre-abandon status ONLY through the alias (the standalone old scope stays skipped); a dangling donor root through the alias IS the graft frontier (rerun-dangling continues from the donor checkpoint). `AbandonAttempt` carries logicalTaskId (XF-04); the extension IO gains `abandonBranch`, `registerAlias`, and `priceUsd`. Plan: PlanRunner wires the DedupIndex at the fold head under the PlanWriteLock into the rebase dedup hook (transforms embed the verdict, the donor descriptor, and the placement into the revision entry), applies the per-SpawnKey osc_guard rejection, attaches DedupNotes to fresh admits, compiles applied cancel_task (and cancel-landed) into severing abandon entries with lineage attribution, lands node.link entries and by-ref roots in the mandatory write order with idempotent roll-forward, registers aliases (rebuilt by fold at boot), completes full-linked nodes by reference through an engine decision instead of a dispatch, debits a spawnUnit per reuse link, and renders the abandoned-spend view in plan_view (pinned) and the WakeDigest extras; `PlanRunnerOptions.reuse` carries the docs/03 9.9 config.
- 75d1646: M7-T08: park and unpark. Core: the internal boot-checkpoint channel lets a FRESH dispatch boot from a retained transcript checkpoint (`ExtensionDispatchSpec.bootCheckpointRef`; dangling redispatch checkpoints take precedence), serving park/unpark continuation and the DEF-5 graft boot. Plan: new `park.ts` with the `PinLedger` fold (live pins counted from abandon entries carrying retainWorktree, park pinning and DEF-5 retention SHARE `maxPinnedWorktrees`, default 4), `parkDispositionOf` (checkpoints always retained; worktrees pinned only under capacity, overflow keeps the checkpoint but drops the tree), and `unparkPlacementOf` (continuation from the retained checkpoint; restart when no checkpoint exists or a worktree-isolated node lost its tree: silent resume against a fresh tree is impossible). PlanRunner lands parks at the turn boundary: a park-requested running child is aborted, the `park-landed` plan.decision transitions running to parked carrying the checkpoint anchor (set_node_status gains the optional checkpointRef field, applied by the fold), the branch is severed with retainCheckpoint plus retainWorktree per the pin disposition, the dispatch slot frees for the unpark, and node:parked emits. unpark_task applies with the embedded admission: a previously dispatched branch is a lineage rebirth (relation 'unpark-restart' continuing the node's LTID), while a never-started parked node resumes scheduling without consuming an attempt; the unparked dispatch boots from `checkpointRefFor(runId, anchor)` on the continuation path and restarts otherwise. The park-unpark integration test drives the full shape deterministically (one paid tool turn, park inside the second turn, unpark continuation whose booted history carries the paid turn) plus the pin-cap overflow and placement rows as units.
- 5ed23d5: M7-T09: RunLedger (docs/07, section 9). New `ledger.ts`: the CLOSED authored op vocabulary (`brief_set` once per run, `fact_add`/`fact_supersede`, `lesson_add` keyed by (logicalTaskId, approachSig), `observation_add`), `foldLedger` as a pure fold of `ledger.op` entries joined to the journal task table (auto-derived revisionHistory, taskDigests, worldDelta; journal-vs-ledger contradictions render as flagged discrepancies, never as truth), single-writer discipline (foreign-scope ops ignored and flagged), Appendix A section caps (64 facts, 32 lessons, 16 observations) via `ledgerCapViolation`, compaction sufficiency via `ledgerSufficiency`, and the draft-versioned `exportLedger` (`ledgerExportVersion: 'draft-1'`). PlanRunner gains `ledger_append` and `ledger_read`: appends are journaled effect entries of kind `ledger.op` in the orchestrator scope with content-derived keys, idempotent on re-execution (a journaled op acks with the recorded ref and skips validation, so re-executed turns never spuriously reject); a `lesson_add` whose key matches no journaled attempt of that logical task rejects as a typed tool error; `ledger_read` is pinned to the delivered-wake seq exactly like `plan_view`, so a re-executed wake turn renders byte-identical ledger bytes and fold-global counters never enter the transcript.
- 0627413: M7-T10: ModelLadder full (docs/07 section 10; docs/04 section 12; FR-119/FR-313). Core: ladders now RESOLVE through the chain (`canonicalizeLadder` validates the declaration once, FR-119 undeclared-judge-rung ConfigError included, and resolves every rung's effort explicitly; `ladderRungChoice` yields the concrete per-rung ModelChoice; a higher concrete layer shadows a lower ladder and vice versa; a ladder that WINS wire resolution stays a typed ConfigError since rung attempts always carry a concrete override). `ladderLengthOf` reads the normative declaration points (profile `model: { ladder }` or the loop-role routing entry). `foldTermination` debits the rung RESPAWN's embedded admission on raising ladder verdicts (docs/07 11.3 b). New per-engine mechanical gate registry `defaults.gates` (`MechanicalGateProfile` over AgentResult.artifacts). The extension seam gains `io.random` (journaled ctx.random for spot-checks), `io.gates`, and dispatch fields `model` (the concrete rung resolution entering the attempt's identity hash), `memoizeOutcome`, and inline `schema` for the engine-synthesized judge. Plan: new `ladder.ts` plus the PlanRunner ladder driver: rung attempts are ordinary agent scopes on the concrete rung model with rung caps binding (tier N+1 = new content key = one live attempt, all sharing the LTID via relation `rung-retry` registered from the raising verdict's `nextAttempt`); triggers classify typed (error, limit, schema-exhausted, no-progress first-class via the abort class, verify-failed from gates only); acceptance gates run per ok attempt in declaration order with journaled `gate-verdict` decisions (mechanical registry profiles, judge on a declared rung >= the executing rung or explicit override with a forced verdict schema and derived identity, spot-check selection strictly via the journaled draw); every ladder verdict is a decision entry computed once live and recovered by content key, so folds consume only journaled values; a denied respawn writes `termination.denied` strictly before the fallback lands; an ok attempt whose acceptance fails with no raise left lands `failed`, never `done`. Mid-flight resume redispatches running nodes through forward matching (dangling attempts continue, settled ones replay instantly): the half-escalated-ladder shape resumes without repaying completed rungs, proven by the truncated-journal test.
- 55c0f87: M7-T11: EscalationProtocol completion (docs/07 section 6; DEF-2/3/4). Core: Flavor B now REQUIRES an explicit `deadlineMs` (the knob has no engine default per the frozen Appendix A row; a flavor B spawn without it is a typed ConfigError before any LLM call); SpawnRecord captures the dispatch's escalation flavor and the WakeDigest escalations block reports it (a flavor B report reaching the digest is already decided by the DEF-4 winner). Plan: new `escalation.ts` with the authoritative `escalation-decision` entry contract (decide-once per report by content key; `countsAgainstLimit` derived from the report kind, XF-06; the counting debit atomic with the append embedding `escalationUnitsAfter`; a DENIED debit writes `termination.denied` strictly before and flips the entry to `capExceeded` with `countsAgainstLimit: false`, so the cap yields the flagged decision plus the final report, never a bare limit, and the folds stay replay-strict). PlanRunner completes the decision flow: the `cancel_task` revision transform on an escalated node lands the verdict `cancel` decision, the `resolve_escalation` plan.decision (origin `escalation-live`), and the severing abandon strictly after the revision append; a settled Flavor B suspension's DEF-4 winner (timeout `defaultDecision` by `timeout`, a live decision, or a class fan-out) is absorbed into the authoritative entry (origins `escalation-default`/`escalation-class`) and the fate applies through the single applier (retry re-opens the node in place with the journaled `amendedPrompt`/`startTier` honored at re-dispatch, accept closes the paid partial result done, cancel closes cancelled, decompose leaves the node escalated while the proposed children enter through `spawn_admitted` ops with FRESH lineages and embedded admissions debiting spawn units through the decision entry).
- fd33871: M7-T12: orchestrator cap and finalize reserve (DEF-7; docs/07 section 12). BREAKING for PlanRunner runs (v0.8.0 registry, docs/12): `orchestratePlanned` now REQUIRES a resolvable orchestrator cap; a run with no USD ceiling and no explicit `budget.capUsd`, or with `effectiveCap < finalizeReserve`, refuses to start with a typed `OrchestratorCapConfigError` BEFORE the first LLM call and before any journal entries (an uncapped orchestrator was precisely the defect; `capFraction` up to 1.0 opts out explicitly). `effectiveCapUsd = min(capUsd, capFraction x runCeiling)`, default fraction 0.2. The engine writes ONE `orchestrator_budget_reserve` decision entry strictly after `termination.init` and strictly before the orchestrator's first agent entry, freezing the cap and the finalize reserve (explicit, or `finalizeTurns` x the deterministic per-turn estimate) in absolute dollars, recovered by content key on resume and never re-evaluated. The reserve registers on the orchestrator account AND the run root (kept separate from committedReserve; the admission block checks add it), so no spawn ever eats the finalization money. At the pre-wake soft boundary (`orchSpent + turnEstimate > effectiveCap - finalizeReserve`) the engine writes exactly ONE `orchestrator_budget_cap` decision strictly before any effects (an in-flight latch closes the wake-ordinal race): the plan freezes for adaptation but not for work (the rebase context `frozen` flag drops every op `plan_frozen` while admitted nodes run to completion), all wake triggers except quiescence disarm, and the orchestrator unwinds to the reserved FINAL wake: a fresh agent entry on the restricted single-`finish` toolset with a `finalizeTurns` limit, paid from the reserve; success yields outcome `ok` with `forcedFinish` marked in the CostReport. If the final finish fails, `orchestrator_finalize_fallback` journals and the engine SYNTHESIZES a deterministic partial result by pure fold with zero LLM calls; the run ends `exhausted` with the non-null partial (`RunOutcome.value` now survives exhaustion). Every digest carries the `WakeBudgetBlock` (run and orchestrator spend, cap, reserve, the epsilon-floored orchestrator share, `softWarning` at 0.8) with `orchestrator:budget` telemetry at each wake boundary and at the cap; `CostReport.orchestrator` populates spentUsd, wakes, forcedFinish, and reserveUsedUsd for H-OrchShare.
- e70e7f4: M7-T13: the FINAL normative WakeDigest in ONE coordinated schema change (docs/07 section 5; XF-08/XF-12, inside the frozen hashVersion-2 identity rules). `WakeDigest` now declares every block first-class: `digestSeq`, `planHash` (emission-time plan hash, empty outside PlanRunner), `coversToOrdinal`, `completedDigests` ordered by spawn ordinal, `escalations` (with the Flavor B `deadlineAt`), the MANDATORY `termination` snapshot (DEF-2, contributed by the PlanRunner extension as a pure fold), the MANDATORY `budget` block (`WakeBudgetBlock`, DEF-7), and the `reuse` stats (the AbandonedSpendView shape, DEF-5). Runs without the PlanRunner extension ship all-zero blocks (`emptyDigestBlocks`), mirroring the CostReport convention. The digest render is bounded deterministically: the new `renderBudgetChars` option clamps each TaskDigest `outputSummary` by CHARACTERS (the model-independent interim measure; the tokenizer choice stays the docs/14 open question, the numeric default TBD before M10). Pinning semantics are unchanged: the digest is part of the wake snapshot and a re-executed turn reads identical bytes.
- bc9c903: M7-T14: the M7 gating cassettes and the remaining metric wiring (docs/09 sections "Metrics" and "Mandatory defect cassette catalog"). Thirteen frozen cassettes record the round-2 set (revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung), the DEF-7 set minus queue-failover (cap-freeze-then-finish, crash-between-cap-and-effects, finalize-fallback-synthesized, escalation-storm-frozen), and representative DEF-2/DEF-3 rows (revision-exhaustion, rung-retry-lineage, decompose-mints-children), each double-run at record time and replayed byte-for-byte in CI through the new public `@lurker/plan` cassette runners with deterministic journal normalization (ULIDs, content hashes, wall clock, spans, and refs collapse to first-appearance placeholders). Metric events: `orchestrator:woke` now carries `planHash`, `coversToOrdinal`, and `renderSize` (the deterministic character measure of the delivered digest, the wake-render-size metric); the escalated landing emits `escalation:raised` with the report kind, the lineage attribution, `agentType` (the escalation-rate slice), and `costToDateUsd`; the abandoned/reclaimed/netLost USD view rides every digest through the T13 reuse block and `ledger:op` plus `spawn:*` events already feed ledger-ops-per-spawn.

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
  - @lurker/core@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @lurker/core@0.7.0

## 0.6.0

### Patch Changes

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
