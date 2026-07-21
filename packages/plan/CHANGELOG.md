# @rulvar/plan

## 1.35.0

### Minor Changes

- d4ac3bf: Validate `RevisionGuards` limits at construction (v1.34.0 review P2-3). The streak and oscillation limits must be positive integers, the stall replan cap a nonnegative integer, and `maxAbandonedNetUsdFraction` a fraction in (0, 1]; anything else, NaN included, is a typed `ConfigError` before any revision is judged. Unvalidated, a NaN limit inverted the machinery: the dropped and oscillation guards tripped immediately while the stall cap never tripped at all.

### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

## 1.34.0

### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

## 1.33.0

### Patch Changes

- @rulvar/core@1.33.0

## 1.32.0

### Patch Changes

- @rulvar/core@1.32.0

## 1.31.0

### Patch Changes

- @rulvar/core@1.31.0

## 1.30.0

### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

## 1.29.0

### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

## 1.28.0

### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

## 1.27.0

### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

## 1.26.0

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

## 1.25.0

### Patch Changes

- @rulvar/core@1.25.0

## 1.24.1

### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

## 1.24.0

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

## 1.23.0

### Minor Changes

- 1f9c272: PlanRunner spawn telemetry, the missing evals export, and the conformance kit's new meta field (v1.22.0 review P2-5, P2-6, P1-2).

  - `@rulvar/plan`: PlanRunner journals every admission INSIDE a carrying entry (decomposition rows in escalation decisions, ladder-verdict respawns, reuse and graft links, revision admissions) and emitted no `spawn:admitted`/`spawn:rejected` at all; a live PlanRunner run with admitted roots showed an event count of zero. Every embedded admission row now announces through one formatter, identically on the live path and on replay absorb, with `replayed: true` on recovered rows, `entryRef` on the journaled carrying entry, and `agentType` resolved from the landed specs.
  - `@rulvar/evals`: `agentTypeRuleHolds` joins the package root next to `rungRuleHolds`, exactly as the v1.21.0 changelog had already announced; a public-API test now imports the checkpoint quartet from the root. The evals guide gains a full measured-value checkpoint section (ladder/pool/cell/arm vocabulary, both criteria, the vacuous-pass guard, cost discipline, a runnable example).
  - `@rulvar/store-conformance`: the meta round-trip case now also pins the new optional `RunMeta.segments` field, which the engine bumps durably at every resume to keep event `seq`/`spanId` unique per run.

### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

## 1.22.0

### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

## 1.21.0

### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

## 1.20.0

### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

## 1.19.0

### Minor Changes

- 8cc9a9c: `orchestrate(engine, goal, opts?, runOptions?)` and `orchestratePlanned(engine, goal, opts?, runOptions?)` accept the created run's `RunOptions` as an optional fourth argument, threaded verbatim to `engine.run`. `runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree (the orchestrator and every child), immutable after start and frozen into `RunMeta`, while `opts.budget` only shapes the orchestrator's own sub-account inside that ceiling; the two layers were previously conflatable, and the canonical shortcuts could not set a root ceiling (or signal, runId, limits, deadline) at all without dropping to `engine.run(makeOrchestratorWorkflow(goal, opts), undefined, runOptions)`. Purely additive; existing calls are unchanged, and a call without `runOptions` still starts an UNCAPPED run, which the docs now state explicitly.

### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

## 1.18.0

### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

## 1.17.0

### Patch Changes

- @rulvar/core@1.17.0

## 1.16.2

### Patch Changes

- @rulvar/core@1.16.2

## 1.16.1

### Patch Changes

- @rulvar/core@1.16.1

## 1.16.0

### Patch Changes

- @rulvar/core@1.16.0

## 1.15.0

### Patch Changes

- @rulvar/core@1.15.0

## 1.14.0

### Patch Changes

- @rulvar/core@1.14.0

## 1.13.0

### Patch Changes

- @rulvar/core@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

## 1.9.0

### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

## 1.8.0

### Minor Changes

- 7884ec5: PlanRunner plan admission is now atomic with child dispatch admission (the v1.7.0 follow-up review's P1). Previously a `plan_revise` op could be journaled as `admit` (consuming its spawn unit) and only then have `scheduleReady`'s dispatch rejected by the engine budget, stranding the node ready forever, losing the `plan:revised` event, and burning the orchestrator budget with no worker output.

  - An `add_task` op whose resolved profile `estCost` cannot fit the effective child ceiling (rung-resolved `maxCostUsd`, else `budgetUsd`) is bounced at rebase time with the new typed reason `reserve_exceeds_budget` naming the child account, requested and resolved reserve, ceiling, and minimum correction. No plan state changes and no spawn unit is consumed; the `plan_revise` tool result carries the reason verbatim.
  - The read-only admission branch now projects the SAME reserve the dispatch layer will commit (estimate clamped by the explicit child budget only), plus the pending reserves of earlier ops in the same revision, so every embedded admit of one batch is dispatchable under the snapshot it was decided on. The dynamic `spawn_agent` path passes the profile estimate into admission for the same reason.
  - Layer 1 (ctx.agent) clamps its committed reserve to the tightest `child-allowance` account headroom on the chain (a plan node's own sub-account, a `ctx.workflow` child ceiling): an allowance already bounds the child's lifetime spend, so an estimate above it clamps instead of denying, which is what makes "admit implies dispatchable" hold by construction. The run root and orchestrator cap are never clamped against; their headroom is shared money that projected admission keeps protecting.
  - `plan:revised` and `termination:debit` now emit strictly after the durable revision append and before the scheduling effects, so a scheduling fault cannot erase an applied revision from the event stream.
  - The residual class (facts that genuinely changed between admit and dispatch, e.g. the engine lifetime spawn cap) lands the node terminally `failed` through a journaled `plan.decision` with the new origin/cause `dispatch-rejected`; other ready nodes still dispatch and the run proceeds.

  Acceptance tests cover the review's live shape (profile `estCost` 0.015 against `budgetUsd` 0.01), the positive control, resume idempotence, the containment path, and an admit-implies-dispatchable property grid over estimates, budgets, ceilings, flat reserves, and prior commitments.

- 52db30d: `termination.init` now freezes the ACTUAL orchestrator budget dollars instead of zeros, closing the journal-contract gap the v1.7.0 follow-up review found: the budgets guide documents `orchestratorCapUsd` and `finalizeReserveUsd` as frozen in the same limits vector as the counters, but PlanRunner journals stored `0` for both and only the later `orchestrator_budget_reserve` decision carried the real values.

  - The engine resolves the effective cap and finalize reserve strictly before extension boot and exposes them on `OrchestratorExtensionIO` (`orchestratorCapUsd`, `finalizeReserveUsd`); PlanRunner writes them into `termination.init`.
  - On resume the cap dollars are now recovered from the frozen `orchestrator_budget_reserve` decision instead of being re-derived from live options (DEF-2 config-drift-resume: the journal wins). A diverging live `capUsd`/`capFraction`/`finalizeReserveUsd` emits `termination:config-drift` and is never honored.
  - Journals recorded before this release (zeros in `termination.init`) replay unchanged: the fold reads the init entry by kind, and the reserve decision remains their authority.
  - The reserve-decision presence guard is now scoped to the orchestrate call, so nested capped orchestrations each journal their own freeze.

  The frozen cassette catalog is re-recorded (the init limits vector and its content key change); hashVersion stays 2, and the fixture lock refresh carries the required hashVersion-bump token.

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

- 7d1a287: ModelKnowledge phase 3, first slice (M12-T02, unlocked by the passed measured-value checkpoint): the kb_propose orchestrator tool and the quarantined modelObservations write path. PlanRunner registers kb_propose on explicit opt-in (PlanRunnerOptions.kbPropose, like any opt-in tool); its payload is tier-relative (the orchestrator never names a model) and the engine resolves the tier against the referenced lineage's declared ladder into the concrete KbProposal subject, validates that the tier has a journaled attempt and that evidence refs resolve to this run's decision entries, and journals the proposal as the observation_add ledger.op through the single-writer path. Quarantine is absolute: the ack is entryRef only, ledger_read withholds observation content behind a count (byte-stable for observation-free renders), worker prompts never see it, and nothing can commit during a run (the runtime handle has no write path by API shape); proposals reach the human gate only through the post-run LedgerExport. Core exports KbProposal, KbProposalTrigger and the typed model-free proposalStatement template. The kb-propose-quarantine cassette joins the frozen catalog (61 IDs).

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

- 0e0b569: M10 entry: the render budgets of docs/06 Appendix A are committed (the TBD-before-M10 rule) and wired as engine defaults; OQ-04 (the renderBudget measure) closes on the CHARACTER measure.

  - WakeDigest: 400 chars per outputSummary row, one exported constant (`WAKE_SUMMARY_RENDER_BUDGET_CHARS`) now serving both the distillation cap (adopted unchanged, the value frozen into every cassette since M6) and the digest render default of `renderBudgetChars`, which stays overridable per orchestration.
  - ledger_read render: 65536 chars over the serialized view via the new pure `boundLedgerRender` (exported with `LEDGER_RENDER_BUDGET_CHARS`): over budget, rows drop deterministically oldest-first (auto-derived joins before authored sections, the mission brief slices last) and every drop renders as a FLAGGED discrepancy line. The section caps stay the primary bound, so under default termination limits the belt never engages; all frozen fixtures are byte-identical.
  - KB card: 4096 chars, committed in docs and consumed by the M10-T03 card renderer.

- 4454175: M10-T03: the ModelKnowledge read path (docs/05, sections "Read path" and "Security"). kb_pinned and kb_repinned land, the card renders, and the whole feature is store-gated: an engine without `stores.modelKnowledge` writes no kb entries at all, so every existing journal and cassette stays byte-stable (zero added awaits on the off path).

  - `createEngine` accepts `stores.modelKnowledge`; the runtime holds ONLY the `current()` handle (commit is physically absent inside runs).
  - One read at run admission for orchestrate-role runs: the engine filters claims (active, unexpired, reachable through the run's declared ladders after the role-floor filter) and journals `kb_pinned { version, hash, cardText }` with the card bytes EMBEDDED, strictly before the first orchestrator turn. Resume and replay read the entry bytes and never touch the live store.
  - A fresh `kb_repinned` lands on every wait_for_events wake under the same filtering rules against a FRESH store read, so expired, stale, and archived claims never steer spawns after pauses; a mid-run store commit affects only subsequent pins.
  - `modelKnowledgeCard`: deterministic, two-layer, tier-relative, 4096-char budget (oldest notes withhold behind an explicit marker). The verified layer compiles EXCLUSIVELY from eval-measured claims (empty in phase 1) with the one-rung clamp; editorial notes render dated and explicitly marked, never compiled into a tier; the orchestrator never sees model names. The card docks into the spawn tool description beside the profile card.
  - OQ-11 closes: editorial notes render for every taskClass with no self-description suppression (the nameless tier-relative render already blunts the feared bias).
  - Two catalog cassettes (docs/09, new section 6.11): kb-pin-replay and kb-repin-expiry, recorded offline over a deterministic stub store with time-stable dates; the cassette-catalog CI job runs them.

- 6599ca8: M10-T05: the taskClass binding interim rule becomes the phase-1 resolution (docs/05, section "Phases and placement"; docs/14 OQ-12 CLOSED). The classification source is author declaration: the optional `taskClass` on AgentProfile, TaskSpec, and spawn_agent params; absence means unclassified and stores no literal string anywhere. Card recommendations never apply to unclassified spawns (in phase 1 no recommendation application exists at all; the M11 compiler inherits the rule as normative).

  - The plan dispatch now forwards the declared TaskSpec.taskClass onto the ExtensionDispatchSpec, completing the substrate: a declared class journals inside the spawn-admission decision (spawn_agent path) and the plan.revision spec of record (PlanRunner path), so M11 matrix sweeps and the recommendation compiler slice attempts by class from journals alone.
  - Byte-neutral: journals without declared classes are unchanged; floors stay profile-driven per docs/04.

- 0fbe7ea: M9-T04 (part 1): the DEF-2 and DEF-3 catalog rows deferred at M7 (docs/09 sections 6.2 and 6.3; docs/10 M9 row "Complete catalog green in one CI run"), plus the producers and liveness fixes the rows exposed.

  - Nine new frozen cassettes with public runners and byte-for-byte replay tests: combined-loop-descent, config-drift-resume, class-storm-single-turn, oscillation-bounded, race-timeout-vs-live (DEF-2); respawn-preserves-counter, reworded-lessons-collide, stall-streak-classes-and-pinning, legacy-journal-resume (DEF-3). The class and race rows additionally round-trip their frozen bytes through BOTH reference stores (JsonlFileStore and SqliteStore) with identical loads, per the store-independence rule.
  - `@rulvar/plan`: the class-level escalation decision producer lands (docs/07 6.5): two or more same-kind reports resolved by ONE revision merge into ONE escalation-decision entry with per-lineage `debits` rows and resolvedBy 'class'; a denied per-lineage debit degrades the group to single-target decisions so denial semantics stay per report. The folds already consumed this form; single-target behavior and all existing cassette bytes are unchanged.
  - `@rulvar/plan`: `termination:config-drift` now actually fires on resume when a live termination knob diverges from the journaled `termination.init` (the journal wins, the divergence is reported per field; docs/07 11.2). Events are never journaled, so frozen cassettes are unaffected.
  - `@rulvar/plan`: a `retry` escalation decision re-opens the node AND clears its stale dispatch handle; previously the re-opened node sat ready forever while the scheduler skipped it (the re-dispatch liveness gap behind Flavor B defaultDecision retry).
  - `@rulvar/plan`: `lesson_add` keys once (docs/07 9.2): a repeated add with the same content key acks the recorded lesson instead of appending a duplicate; re-executed-turn recovery is unchanged.
  - `@rulvar/core`: an extension dispatch whose agent dies BEFORE its root entry lands now surfaces the underlying failure loudly to the dispatching caller instead of hanging the dispatch await forever (the pre-root cousin of the stale-writer liveness rule). Healthy paths and replays are byte- and timing-identical.
  - Known residual, unchanged: repeated Flavor B suspensions on ONE re-opened node dedup onto the first suspension's decision key; the recorded cassettes route around it and the at-cap immediate-resolution flavor rows stay with M9-T04's later parts.

- ebe0abc: M9-T04 (part 2): the six DEF-5 catalog cassettes (docs/09 section 6.5; docs/03 section 9), plus the reuse-producer completions the rows forced.

  - Six new frozen cassettes with public runners and byte-for-byte replay tests: oscillation-full-reuse (escalated-terminal donor, shared full link, by-ref root, reclaimedUsdAtLink carries the donor spend), graft-partial-subtree (a three-rung limit ladder severed mid-top-rung grafts exclusively; the completed rung attempts forward-match through the scope alias and only the interrupted rung reruns live, exactly once), crash-between-link-and-root (cut strictly between the durable node.link and the by-ref root; the resume rolls forward with zero repayment), oscillation-guard-trip (the third re-add at maxOscillationsPerKey 2 rejects osc_guard with the embedded verdict and the run closes non-HITL), worktree-disposed-degrade (an unpinned worktree graft donor degrades to a fresh admit with DedupNote graft_unsafe; reuse_full stays allowed for a worktree donor with a terminal root), claim-exclusivity-and-chain (two identical adds in ONE revision: the first grafts exclusively, the second degrades donor_active; the severed grafted node becomes the chain head and the third add drains the chain transitively; oscillationCount reaches 2).
  - `@rulvar/core` (docs/03 9.3/9.6 producer completions, folds and bytes of existing journals unchanged): evaluateReuse now skips exclusively-claimed donors (first-wins) and degrades to a fresh admit with the documented `donor_active` reason when every candidate is captured; a severed grafted node inherits its captured link's chain (ancestry plus chain-tail graft eligibility), so the next add links to the chain head and drains transitively; agent dispatch roots record their resolved isolation (`value.isolation`, only when not 'none') so the DedupIndex worktree rules can read it from the journal.
  - `@rulvar/plan`: exclusive captures are first-wins WITHIN one revision too: the second identical add of the same revision degrades to `donor_active` instead of double-claiming the donor.
  - All fifteen M9 cassettes re-record byte-identically under the double-run agreement; the nine part-1 fixtures are untouched by the producer changes. fixtures.sha256 covers 50 frozen files.

- a3079d0: M9-T04 (part 3): the six DEF-8 catalog cassettes plus the DEF-7 reserve-survives-run-exhaustion row (docs/09 sections 6.7 and 6.8), with the roll-forward and reserve producers the rows exposed.

  - Seven new frozen cassettes with public runners and byte-for-byte replay tests: revise-racing-defaultDecision (the mandatory stale-wake trio dropping dep_already_resolved with blockingRef, node_escalated, node_already_done in ONE revision), crash-after-append-before-effects (the pre-effects kill point; both children spawn live exactly once on resume and the request-only cancel lands on the redispatched branch), amend-vs-running-then-cancel-add, intra-revision-self-conflict (sequential intra-revision semantics), bad-base-streak-terminates (three fabricated-base all-dropped entries then the non-HITL guards fallback), park-races-child-completion (parkRequested extinguished by the child-result transition, no park retention), and reserve-survives-run-exhaustion (adds that would invade the committed finalize reserve drop admission_denied inside the revision outcomes; the forced finish executes FROM the reserve and closes the run ok).
  - `@rulvar/plan`: the idempotent plan_revise recovery path now also re-lands request-only cancels and parks by aborting the redispatched mid-flight branch; previously the crash-after-append-before-effects roll-forward left the cancelled branch running forever.
  - `@rulvar/plan`: an accepted escalation resolution records the node's done reference (doneRefs), so a later waive_dep against the resolved dependency drops dep_already_resolved with the blockingRef pointing at the resolving reference, exactly like a child-result transition.
  - `@rulvar/core`: the forced finish now RELEASES the finalize reserve as it begins (releaseFinalizeReserve): the reserve stops subtracting from the admission remainder at the moment it is being spent, or the finalize agent could never draw the money reserved for it under a tight run ceiling. Admissions stay frozen past the cap, so nothing else can take it. Cap behavior under unlimited ceilings (all existing cassettes) is byte-identical.
  - All 22 M9 cassettes re-record byte-identically under the double-run agreement; fixtures.sha256 covers 57 frozen files.

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

- f920013: M8-T03: the multi-process seam soak and the queue-failover-during-forced-finish cassette (the DEF-7 final cassette; docs/09 sections 6.9 and 6.10; docs/10 section 3.9 exit criteria).

  - `@rulvar/plan`: the public `runQueueFailoverDuringForcedFinish` cassette runner: worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, finalization is paid once. The LeasableStore is injected (`QueueFailoverDeps.makeStore`) so the package stays core-only; the replay test and the record script supply the reference SqliteStore.
  - `@rulvar/cli`: the multi-process-fencing-soak harness: two workers over one SqliteStore file with kill/failover across the suspension, plan-revision, and forced-finish boundaries; every round asserts zero split-brain and zero double pay. Worker hardening: a failed renew now frees the concurrency slot immediately (a stale run whose landings all reject may never settle; fencing, not the stale process's cooperation, protects the journal).
  - Repo: `cassettes/queue-failover-during-forced-finish.json` recorded and frozen (double-run agreement; `scripts/record-m8-cassettes.mjs`); the queue-mode limitation stays documented (no distributed cross-process rate limiter, EXC-14/OQ-17).

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

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
- a41c20f: M7-T05: PlanRunner scheduling and toolset. Core gains the PUBLIC orchestrator extension seam (docs/02 section 4 seam-sufficiency: orchestration packages build exclusively from the public API): `OrchestrateOptions.extension` hosts an `OrchestratorExtension` with boot strictly before the orchestrator's first agent entry, extension tools appended to the mode (c) toolset, an activity hook running after every child settlement strictly before wake evaluation, quiescence participation (nothing running AND nothing ready), digest extras, wake observation, prompt lines, and an `OrchestratorExtensionIO` exposing total-order appends into extension-owned scopes, the journal snapshot, the single admission point, explicit-scope child dispatch through the ordinary ctx.agent path (plan/NodeId sub-accounts open beside the orchestrator account), settled lookups, cancel, ULID minting, and telemetry. `outputSchemaRef`/`toolsetRef` now RESOLVE against the new `defaults.schemas` and `defaults.toolsets` engine registries (unknown names stay typed tool errors); `TerminationAccount.bindDeniedWriter` binds I/O onto fold-rebuilt accounts. @rulvar/plan ships `planRunner(options)` and `orchestratePlanned(engine, goal, opts)`: boot writes `termination.init` (frozen limits with kMax and the profile-registry snapshot hash) strictly before the first scheduling entry and binds the account into admission; plan_view renders the pinned pure fold (plan state, per-node LineageStats, the TerminationAccount snapshot) at the last delivered WakeDigest, with digestSeq 0 seeded as the empty-plan bootstrap snapshot; plan_revise (normative docs/07 4.7 schema) debits one revisionUnit per journaled revision (underflow writes termination.denied first), evaluates the committed rebase at the fold head, appends ONE plan.revision strictly before effects, schedules newly-ready nodes under plan/NodeId scopes, lands cancel requests, re-issues idempotently on re-executed turns (roll-forward), and emits plan:revised plus termination:debit; the engine (never the model) schedules ready nodes and journals ready-to-running and terminal transitions as plan.decision entries whose terminal transitions extinguish pending flags; quiescence completes (nothing running and nothing ready). The end-to-end revise-mid-run shape and a full crash-resume with zero live calls and no duplicate entries are covered by integration tests against the public engine API.
- 51b062a: M7-T06: RevisionGuards, the oscillation detector, and hysteresis (docs/07 3.8). New `guards.ts`: the non-HITL terminating guard state machine whose every verdict is a journaled decision entry (decisionType 'guard-verdict') written strictly BEFORE its effects, with replay rebuilding state from journaled verdicts. The droppedRevisionStreak detector consumes `effectiveDroppedStreak` (the hashed counter plus trailing bad_base entries) and fires the configured fallback (reject-revision | finish-with-partial | fail-run; default finish-with-partial, droppedRevisionLimit default 3) exactly once: further plan_revise calls are rejected with a typed tool error instructing a finish with the partial result, and the fourth revision after a three-bad-base streak journals nothing and debits nothing. The oscillation detector keys on approachSigCoarse ACROSS LogicalTaskId boundaries: a re-add after a severing cancel counts one oscillation, the per-key limit (2, the Appendix A osc_guard default) freezes the signature with a journaled verdict plus a guard:oscillation event, and frozen re-adds reject at admission with the embedded osc_guard verdict (dropped admission_denied in the revision entry); guard counters are fed from the plan fold itself, identically live and on replay, so freeze thresholds never shift across a resume (fired-but-unjournaled verdicts roll forward at boot, deduplicated by content key). Stall detection emits stall:detected per (lineage, streak) with the hard per-run stall replan cap journaling its own verdict; hysteresis stays structural (park/cancel against running nodes land only as boundary flags, so nearly-done children are never killed mid-turn). plan_view now renders the guards block (engaged fallback, frozen signatures, stall replans used).
- f4e70be: M7-T07: reuse-by-reference (DEF-5). Core: new `journal/reuse.ts` with the rich `DonorRef` (replacing the M6 seq placeholder inside the closed AdmitVerdict union), `GraftBoot`, `DedupNote`, `ReuseConfig`, `NodeLinkValue` and its content identity (`nodeLinkKey` over {kind, spawnKey, donorScope, targetNodeId}), the `DedupIndex` pure fold (severed roots become donor candidates when their pre-abandon effective status is not error, memoized failures excluded, exclusive claims resolve first-wins, plan-node scopes sweep their own branch payments, unpinned worktree donors degrade), `evaluateReuse` with the four-outcome verdict table (reuse_full | admit_graft | fresh-with-note | reject osc_guard at the link count), and the abandoned-spend ledger fold (abandonedUsd/reclaimedUsd/netLostUsd, per-key oscillation counts). The kernel matcher gains scope-prefix aliasing (docs/03 9.5): `registerAlias` merges donor-scope candidates into the target scope in journal order at every nested level, and the alias disposition bypasses the abandon overlay so donor entries regain their pre-abandon status ONLY through the alias (the standalone old scope stays skipped); a dangling donor root through the alias IS the graft frontier (rerun-dangling continues from the donor checkpoint). `AbandonAttempt` carries logicalTaskId (XF-04); the extension IO gains `abandonBranch`, `registerAlias`, and `priceUsd`. Plan: PlanRunner wires the DedupIndex at the fold head under the PlanWriteLock into the rebase dedup hook (transforms embed the verdict, the donor descriptor, and the placement into the revision entry), applies the per-SpawnKey osc_guard rejection, attaches DedupNotes to fresh admits, compiles applied cancel_task (and cancel-landed) into severing abandon entries with lineage attribution, lands node.link entries and by-ref roots in the mandatory write order with idempotent roll-forward, registers aliases (rebuilt by fold at boot), completes full-linked nodes by reference through an engine decision instead of a dispatch, debits a spawnUnit per reuse link, and renders the abandoned-spend view in plan_view (pinned) and the WakeDigest extras; `PlanRunnerOptions.reuse` carries the docs/03 9.9 config.
- 75d1646: M7-T08: park and unpark. Core: the internal boot-checkpoint channel lets a FRESH dispatch boot from a retained transcript checkpoint (`ExtensionDispatchSpec.bootCheckpointRef`; dangling redispatch checkpoints take precedence), serving park/unpark continuation and the DEF-5 graft boot. Plan: new `park.ts` with the `PinLedger` fold (live pins counted from abandon entries carrying retainWorktree, park pinning and DEF-5 retention SHARE `maxPinnedWorktrees`, default 4), `parkDispositionOf` (checkpoints always retained; worktrees pinned only under capacity, overflow keeps the checkpoint but drops the tree), and `unparkPlacementOf` (continuation from the retained checkpoint; restart when no checkpoint exists or a worktree-isolated node lost its tree: silent resume against a fresh tree is impossible). PlanRunner lands parks at the turn boundary: a park-requested running child is aborted, the `park-landed` plan.decision transitions running to parked carrying the checkpoint anchor (set_node_status gains the optional checkpointRef field, applied by the fold), the branch is severed with retainCheckpoint plus retainWorktree per the pin disposition, the dispatch slot frees for the unpark, and node:parked emits. unpark_task applies with the embedded admission: a previously dispatched branch is a lineage rebirth (relation 'unpark-restart' continuing the node's LTID), while a never-started parked node resumes scheduling without consuming an attempt; the unparked dispatch boots from `checkpointRefFor(runId, anchor)` on the continuation path and restarts otherwise. The park-unpark integration test drives the full shape deterministically (one paid tool turn, park inside the second turn, unpark continuation whose booted history carries the paid turn) plus the pin-cap overflow and placement rows as units.
- 5ed23d5: M7-T09: RunLedger (docs/07, section 9). New `ledger.ts`: the CLOSED authored op vocabulary (`brief_set` once per run, `fact_add`/`fact_supersede`, `lesson_add` keyed by (logicalTaskId, approachSig), `observation_add`), `foldLedger` as a pure fold of `ledger.op` entries joined to the journal task table (auto-derived revisionHistory, taskDigests, worldDelta; journal-vs-ledger contradictions render as flagged discrepancies, never as truth), single-writer discipline (foreign-scope ops ignored and flagged), Appendix A section caps (64 facts, 32 lessons, 16 observations) via `ledgerCapViolation`, compaction sufficiency via `ledgerSufficiency`, and the draft-versioned `exportLedger` (`ledgerExportVersion: 'draft-1'`). PlanRunner gains `ledger_append` and `ledger_read`: appends are journaled effect entries of kind `ledger.op` in the orchestrator scope with content-derived keys, idempotent on re-execution (a journaled op acks with the recorded ref and skips validation, so re-executed turns never spuriously reject); a `lesson_add` whose key matches no journaled attempt of that logical task rejects as a typed tool error; `ledger_read` is pinned to the delivered-wake seq exactly like `plan_view`, so a re-executed wake turn renders byte-identical ledger bytes and fold-global counters never enter the transcript.
- 0627413: M7-T10: ModelLadder full (docs/07 section 10; docs/04 section 12; FR-119/FR-313). Core: ladders now RESOLVE through the chain (`canonicalizeLadder` validates the declaration once, FR-119 undeclared-judge-rung ConfigError included, and resolves every rung's effort explicitly; `ladderRungChoice` yields the concrete per-rung ModelChoice; a higher concrete layer shadows a lower ladder and vice versa; a ladder that WINS wire resolution stays a typed ConfigError since rung attempts always carry a concrete override). `ladderLengthOf` reads the normative declaration points (profile `model: { ladder }` or the loop-role routing entry). `foldTermination` debits the rung RESPAWN's embedded admission on raising ladder verdicts (docs/07 11.3 b). New per-engine mechanical gate registry `defaults.gates` (`MechanicalGateProfile` over AgentResult.artifacts). The extension seam gains `io.random` (journaled ctx.random for spot-checks), `io.gates`, and dispatch fields `model` (the concrete rung resolution entering the attempt's identity hash), `memoizeOutcome`, and inline `schema` for the engine-synthesized judge. Plan: new `ladder.ts` plus the PlanRunner ladder driver: rung attempts are ordinary agent scopes on the concrete rung model with rung caps binding (tier N+1 = new content key = one live attempt, all sharing the LTID via relation `rung-retry` registered from the raising verdict's `nextAttempt`); triggers classify typed (error, limit, schema-exhausted, no-progress first-class via the abort class, verify-failed from gates only); acceptance gates run per ok attempt in declaration order with journaled `gate-verdict` decisions (mechanical registry profiles, judge on a declared rung >= the executing rung or explicit override with a forced verdict schema and derived identity, spot-check selection strictly via the journaled draw); every ladder verdict is a decision entry computed once live and recovered by content key, so folds consume only journaled values; a denied respawn writes `termination.denied` strictly before the fallback lands; an ok attempt whose acceptance fails with no raise left lands `failed`, never `done`. Mid-flight resume redispatches running nodes through forward matching (dangling attempts continue, settled ones replay instantly): the half-escalated-ladder shape resumes without repaying completed rungs, proven by the truncated-journal test.
- 55c0f87: M7-T11: EscalationProtocol completion (docs/07 section 6; DEF-2/3/4). Core: Flavor B now REQUIRES an explicit `deadlineMs` (the knob has no engine default per the frozen Appendix A row; a flavor B spawn without it is a typed ConfigError before any LLM call); SpawnRecord captures the dispatch's escalation flavor and the WakeDigest escalations block reports it (a flavor B report reaching the digest is already decided by the DEF-4 winner). Plan: new `escalation.ts` with the authoritative `escalation-decision` entry contract (decide-once per report by content key; `countsAgainstLimit` derived from the report kind, XF-06; the counting debit atomic with the append embedding `escalationUnitsAfter`; a DENIED debit writes `termination.denied` strictly before and flips the entry to `capExceeded` with `countsAgainstLimit: false`, so the cap yields the flagged decision plus the final report, never a bare limit, and the folds stay replay-strict). PlanRunner completes the decision flow: the `cancel_task` revision transform on an escalated node lands the verdict `cancel` decision, the `resolve_escalation` plan.decision (origin `escalation-live`), and the severing abandon strictly after the revision append; a settled Flavor B suspension's DEF-4 winner (timeout `defaultDecision` by `timeout`, a live decision, or a class fan-out) is absorbed into the authoritative entry (origins `escalation-default`/`escalation-class`) and the fate applies through the single applier (retry re-opens the node in place with the journaled `amendedPrompt`/`startTier` honored at re-dispatch, accept closes the paid partial result done, cancel closes cancelled, decompose leaves the node escalated while the proposed children enter through `spawn_admitted` ops with FRESH lineages and embedded admissions debiting spawn units through the decision entry).
- fd33871: M7-T12: orchestrator cap and finalize reserve (DEF-7; docs/07 section 12). BREAKING for PlanRunner runs (v0.8.0 registry, docs/12): `orchestratePlanned` now REQUIRES a resolvable orchestrator cap; a run with no USD ceiling and no explicit `budget.capUsd`, or with `effectiveCap < finalizeReserve`, refuses to start with a typed `OrchestratorCapConfigError` BEFORE the first LLM call and before any journal entries (an uncapped orchestrator was precisely the defect; `capFraction` up to 1.0 opts out explicitly). `effectiveCapUsd = min(capUsd, capFraction x runCeiling)`, default fraction 0.2. The engine writes ONE `orchestrator_budget_reserve` decision entry strictly after `termination.init` and strictly before the orchestrator's first agent entry, freezing the cap and the finalize reserve (explicit, or `finalizeTurns` x the deterministic per-turn estimate) in absolute dollars, recovered by content key on resume and never re-evaluated. The reserve registers on the orchestrator account AND the run root (kept separate from committedReserve; the admission block checks add it), so no spawn ever eats the finalization money. At the pre-wake soft boundary (`orchSpent + turnEstimate > effectiveCap - finalizeReserve`) the engine writes exactly ONE `orchestrator_budget_cap` decision strictly before any effects (an in-flight latch closes the wake-ordinal race): the plan freezes for adaptation but not for work (the rebase context `frozen` flag drops every op `plan_frozen` while admitted nodes run to completion), all wake triggers except quiescence disarm, and the orchestrator unwinds to the reserved FINAL wake: a fresh agent entry on the restricted single-`finish` toolset with a `finalizeTurns` limit, paid from the reserve; success yields outcome `ok` with `forcedFinish` marked in the CostReport. If the final finish fails, `orchestrator_finalize_fallback` journals and the engine SYNTHESIZES a deterministic partial result by pure fold with zero LLM calls; the run ends `exhausted` with the non-null partial (`RunOutcome.value` now survives exhaustion). Every digest carries the `WakeBudgetBlock` (run and orchestrator spend, cap, reserve, the epsilon-floored orchestrator share, `softWarning` at 0.8) with `orchestrator:budget` telemetry at each wake boundary and at the cap; `CostReport.orchestrator` populates spentUsd, wakes, forcedFinish, and reserveUsedUsd for H-OrchShare.
- e70e7f4: M7-T13: the FINAL normative WakeDigest in ONE coordinated schema change (docs/07 section 5; XF-08/XF-12, inside the frozen hashVersion-2 identity rules). `WakeDigest` now declares every block first-class: `digestSeq`, `planHash` (emission-time plan hash, empty outside PlanRunner), `coversToOrdinal`, `completedDigests` ordered by spawn ordinal, `escalations` (with the Flavor B `deadlineAt`), the MANDATORY `termination` snapshot (DEF-2, contributed by the PlanRunner extension as a pure fold), the MANDATORY `budget` block (`WakeBudgetBlock`, DEF-7), and the `reuse` stats (the AbandonedSpendView shape, DEF-5). Runs without the PlanRunner extension ship all-zero blocks (`emptyDigestBlocks`), mirroring the CostReport convention. The digest render is bounded deterministically: the new `renderBudgetChars` option clamps each TaskDigest `outputSummary` by CHARACTERS (the model-independent interim measure; the tokenizer choice stays the docs/14 open question, the numeric default TBD before M10). Pinning semantics are unchanged: the digest is part of the wake snapshot and a re-executed turn reads identical bytes.
- bc9c903: M7-T14: the M7 gating cassettes and the remaining metric wiring (docs/09 sections "Metrics" and "Mandatory defect cassette catalog"). Thirteen frozen cassettes record the round-2 set (revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung), the DEF-7 set minus queue-failover (cap-freeze-then-finish, crash-between-cap-and-effects, finalize-fallback-synthesized, escalation-storm-frozen), and representative DEF-2/DEF-3 rows (revision-exhaustion, rung-retry-lineage, decompose-mints-children), each double-run at record time and replayed byte-for-byte in CI through the new public `@rulvar/plan` cassette runners with deterministic journal normalization (ULIDs, content hashes, wall clock, spans, and refs collapse to first-appearance placeholders). Metric events: `orchestrator:woke` now carries `planHash`, `coversToOrdinal`, and `renderSize` (the deterministic character measure of the delivered digest, the wake-render-size metric); the escalated landing emits `escalation:raised` with the report kind, the lineage attribution, `agentType` (the escalation-rate slice), and `costToDateUsd`; the abandoned/reclaimed/netLost USD view rides every digest through the T13 reuse block and `ledger:op` plus `spawn:*` events already feed ledger-ops-per-spawn.

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

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Patch Changes

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
