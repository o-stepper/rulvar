[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/plan

# @rulvar/plan

The adaptive orchestration extension for dynamic Rulvar runs:
`PlanRunner` treats the task plan as typed, engine-owned data with
journaled revisions, reuse, escalations, and model ladders. Built
entirely on the public core API. Exports `planRunner`,
`orchestratePlanned`, and `buildPlanTools`.

The one-line mnemonic against its sibling: `@rulvar/planner` plans
before the run (it writes the script); `@rulvar/plan` replans during the
run (it revises the task plan).

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/plan
```

## Documentation

- [Adaptive orchestration](https://docs.rulvar.com/guide/adaptive-orchestration)
- [Orchestration modes](https://docs.rulvar.com/guide/orchestration-modes)
- [API reference](https://docs.rulvar.com/api/%40rulvar/plan/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Classes

| Class | Description |
| ------ | ------ |
| [PinLedger](/api/@rulvar/plan/classes/PinLedger.md) | The worktree pin ledger: a pure fold counting live pins from abandon entries carrying `retainWorktree: true` (park pinning and DEF-5 retention share the cap by construction). |
| [PlanWriteLock](/api/@rulvar/plan/classes/PlanWriteLock.md) | PlanWriteLock (M7-T01): the in-process FIFO mutex serializing live appends to the sequential scope "plan". |
| [RevisionGuards](/api/@rulvar/plan/classes/RevisionGuards.md) | The guard state machine. All counting inputs arrive from pure folds (the caller feeds landed revisions, severs, and re-adds in journal order), so live and replay converge on identical verdicts; the caller journals each verdict BEFORE applying its effects. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CassetteTurn](/api/@rulvar/plan/interfaces/CassetteTurn.md) | A minimal scripted adapter over the PUBLIC provider SPI. |
| [EscalationDebitRow](/api/@rulvar/plan/interfaces/EscalationDebitRow.md) | One per-lineage debit row of a class-level decision. |
| [EscalationDecisionValue](/api/@rulvar/plan/interfaces/EscalationDecisionValue.md) | The authoritative escalation-decision entry value (the producer contract of LineageIndex and foldTermination). Exactly one such entry per report; the debit is atomic with the append and the balance-after is embedded (DEF-2). A decision whose counting debit was DENIED carries `countsAgainstLimit: false` plus `capExceeded: true`: the termination.denied entry written strictly before is the counting record, and the folds stay replay-strict. |
| [GateVerdictValue](/api/@rulvar/plan/interfaces/GateVerdictValue.md) | One journaled acceptance-gate evaluation. |
| [GuardsState](/api/@rulvar/plan/interfaces/GuardsState.md) | - |
| [GuardVerdictValue](/api/@rulvar/plan/interfaces/GuardVerdictValue.md) | The journaled guard verdict payload (kind 'decision'). |
| [KbProposeInput](/api/@rulvar/plan/interfaces/KbProposeInput.md) | The model-facing kb_propose payload (tier-relative subject). |
| [LadderVerdictValue](/api/@rulvar/plan/interfaces/LadderVerdictValue.md) | The ladder verdict decision entry: the producer contract both folds already consume. A RAISING verdict debits one rung unit (rungIndexAfter/rungsRemainingAfter embedded, checked by foldTermination) and carries the rung RESPAWN's embedded admission (spawn debit) plus `nextAttempt` (the lineage registration: relation 'rung-retry'). A non-raising verdict records the ladder's end (exhausted rungs, top rung, or a denied respawn) and authorizes nothing. |
| [LedgerExport](/api/@rulvar/plan/interfaces/LedgerExport.md) | The draft-versioned outward seam; the final shape stays an open question. |
| [LedgerFact](/api/@rulvar/plan/interfaces/LedgerFact.md) | - |
| [LedgerLesson](/api/@rulvar/plan/interfaces/LedgerLesson.md) | - |
| [LedgerObservation](/api/@rulvar/plan/interfaces/LedgerObservation.md) | - |
| [LedgerRevisionRow](/api/@rulvar/plan/interfaces/LedgerRevisionRow.md) | One auto-derived revision history row (fold join, never authored). |
| [LedgerView](/api/@rulvar/plan/interfaces/LedgerView.md) | The pure ledger fold. |
| [M7CassetteFixture](/api/@rulvar/plan/interfaces/M7CassetteFixture.md) | One normalized-cassette fixture file (cassettes/&lt;id&gt;.json). |
| [ParkDisposition](/api/@rulvar/plan/interfaces/ParkDisposition.md) | The park disposition computed at landing time. |
| [PlanDecisionValue](/api/@rulvar/plan/interfaces/PlanDecisionValue.md) | The value payload of a plan.decision entry. |
| [PlanFoldState](/api/@rulvar/plan/interfaces/PlanFoldState.md) | The plan fold state: the working state plus fold-side records that deliberately stay OUT of planHash. `badBaseStreak` reconciles two normative clauses: a bad_base revision leaves the hashed state byte-identical (planHashAfter == planHashBefore) yet still lengthens the guard streak: the guards therefore consume `effectiveDroppedStreak`, the hashed counter plus the trailing bad_base entries. `doneRefs` remembers which entry resolved each done node so waive_dep drops can point blockingRef at it. |
| [PlanNode](/api/@rulvar/plan/interfaces/PlanNode.md) | Canonical per-node fields entering planHash, exactly this record. `deps` are sorted in the hash (not necessarily in state); `checkpointRef`/`escalationRef` participate as absent when absent. |
| [PlanReviseRequest](/api/@rulvar/plan/interfaces/PlanReviseRequest.md) | - |
| [PlanReviseResult](/api/@rulvar/plan/interfaces/PlanReviseResult.md) | The canonical result form (XF-11): DEF-8 shape plus the DEF-2 balance. |
| [PlanRevisionAdmission](/api/@rulvar/plan/interfaces/PlanRevisionAdmission.md) | One embedded admission beside its op (DEF-2/DEF-3 folds read it). |
| [PlanRevisionValue](/api/@rulvar/plan/interfaces/PlanRevisionValue.md) | The value payload of a plan.revision entry (XF-11). |
| [PlanRunnerOptions](/api/@rulvar/plan/interfaces/PlanRunnerOptions.md) | Configuration knobs of the PlanRunner extension. |
| [PlanSnapshotRef](/api/@rulvar/plan/interfaces/PlanSnapshotRef.md) | - |
| [PlanToolRuntime](/api/@rulvar/plan/interfaces/PlanToolRuntime.md) | The engine seam the plan tools close over. |
| [PlanViewNode](/api/@rulvar/plan/interfaces/PlanViewNode.md) | One rendered node of the pinned plan_view fold. |
| [PlanViewRender](/api/@rulvar/plan/interfaces/PlanViewRender.md) | The plan_view render: plan state, lineage, termination, reuse. |
| [PlanWorking](/api/@rulvar/plan/interfaces/PlanWorking.md) | The working state the applier threads: the hashed TaskPlan plus the resolved spec table. Specs stay OUT of planHash by construction (the hashed projection is promptSpecHash per node) but are themselves a pure fold of add_task specs, amend patches, and decomposition specs, so live and replay converge byte-identically. |
| [QueueFailoverDeps](/api/@rulvar/plan/interfaces/QueueFailoverDeps.md) | queue-failover-during-forced-finish (the DEF-7 final cassette; M8-T03): worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, and finalization is paid once. |
| [RebaseContext](/api/@rulvar/plan/interfaces/RebaseContext.md) | - |
| [RebaseEvaluation](/api/@rulvar/plan/interfaces/RebaseEvaluation.md) | - |
| [ReuseTransform](/api/@rulvar/plan/interfaces/ReuseTransform.md) | The reuse-by-reference transform hook (DEF-5; M7-T07). |
| [RevisionGuardsOptions](/api/@rulvar/plan/interfaces/RevisionGuardsOptions.md) | RevisionGuards configuration. |
| [TaskPlan](/api/@rulvar/plan/interfaces/TaskPlan.md) | TaskPlan: typed data owned by the engine, never prose in a transcript. The guard fold counters ride the same record because they enter planHash: `revisionCount` counts journaled plan.revision entries; `droppedRevisionStreak` counts consecutive fully-dropped revisions (RevisionGuards). |
| [TaskSpec](/api/@rulvar/plan/interfaces/TaskSpec.md) | - |
| [UnparkPlacement](/api/@rulvar/plan/interfaces/UnparkPlacement.md) | The unpark placement: continuation or restart. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [AppliedPlanOp](/api/@rulvar/plan/type-aliases/AppliedPlanOp.md) | Applied forms the fold consumes. cancel_task gains the engine-computed cascade (computed at apply time, never a parameter); park/cancel against running nodes apply as flag requests landing later via plan.decision (park-landed, cancel-landed). |
| [EnginePlanOp](/api/@rulvar/plan/type-aliases/EnginePlanOp.md) | The closed EnginePlanOp set. |
| [GuardFallback](/api/@rulvar/plan/type-aliases/GuardFallback.md) | - |
| [LedgerOp](/api/@rulvar/plan/type-aliases/LedgerOp.md) | The CLOSED authored op vocabulary. |
| [PlanDecisionOrigin](/api/@rulvar/plan/type-aliases/PlanDecisionOrigin.md) | Engine authorship origins of plan.decision entries. |
| [PlanNodeStatus](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | The closed status machine; `skipped` is fold-derived for entries but first-class for plan nodes. |
| [PlanOp](/api/@rulvar/plan/type-aliases/PlanOp.md) | The orchestrator-facing PlanOp union. |
| [PlanReviseErrorCode](/api/@rulvar/plan/type-aliases/PlanReviseErrorCode.md) | - |
| [RebaseOutcome](/api/@rulvar/plan/type-aliases/RebaseOutcome.md) | - |
| [RebaseReasonCode](/api/@rulvar/plan/type-aliases/RebaseReasonCode.md) | The complete machine reason vocabulary, normative and closed. |
| [TaskSpecPatch](/api/@rulvar/plan/type-aliases/TaskSpecPatch.md) | The amend_task patch form: every field optional. |

## Variables

| Variable | Description |
| ------ | ------ |
| [BUDGET](/api/@rulvar/plan/variables/BUDGET.md) | - |
| [DEFAULT\_DROPPED\_REVISION\_LIMIT](/api/@rulvar/plan/variables/DEFAULT_DROPPED_REVISION_LIMIT.md) | - |
| [DEFAULT\_MAX\_OSCILLATIONS\_PER\_KEY](/api/@rulvar/plan/variables/DEFAULT_MAX_OSCILLATIONS_PER_KEY.md) | Appendix A: osc_guard reject threshold per key (shared default). |
| [DEFAULT\_MAX\_PINNED\_WORKTREES](/api/@rulvar/plan/variables/DEFAULT_MAX_PINNED_WORKTREES.md) | Appendix A: the single pin cap shared by park/unpark and retainWorktree. |
| [DEFAULT\_STALL\_REPLAN\_CAP](/api/@rulvar/plan/variables/DEFAULT_STALL_REPLAN_CAP.md) | The hard per-run stall replan bound. |
| [EMPTY\_PLAN\_HASH](/api/@rulvar/plan/variables/EMPTY_PLAN_HASH.md) | - |
| [JUDGE\_VERDICT\_SCHEMA](/api/@rulvar/plan/variables/JUDGE_VERDICT_SCHEMA.md) | The forced verdict schema of the judge gate. |
| [KB\_PROPOSE\_SCHEMA](/api/@rulvar/plan/variables/KB_PROPOSE_SCHEMA.md) | The normative kb_propose schema (phase 3). The subject is tier-relative: the orchestrator never sees model names, so the handler resolves the rung index against the declared ladder of the referenced lineage into the concrete KbProposal subject. |
| [KB\_PROPOSE\_TOOL\_NAME](/api/@rulvar/plan/variables/KB_PROPOSE_TOOL_NAME.md) | - |
| [LEDGER\_APPEND\_SCHEMA](/api/@rulvar/plan/variables/LEDGER_APPEND_SCHEMA.md) | The closed authored op vocabulary as JSON Schema. |
| [LEDGER\_APPEND\_TOOL\_NAME](/api/@rulvar/plan/variables/LEDGER_APPEND_TOOL_NAME.md) | - |
| [LEDGER\_READ\_SCHEMA](/api/@rulvar/plan/variables/LEDGER_READ_SCHEMA.md) | ledger_read takes no parameters and pins to the turn snapshot. |
| [LEDGER\_READ\_TOOL\_NAME](/api/@rulvar/plan/variables/LEDGER_READ_TOOL_NAME.md) | - |
| [LEDGER\_RENDER\_BUDGET\_CHARS](/api/@rulvar/plan/variables/LEDGER_RENDER_BUDGET_CHARS.md) | The committed ledger_read render budget (Appendix A: 65536 chars over the serialized view, the character measure; OQ-04 closed at M10 entry). The section caps stay the primary bound; under the default termination limits this belt never engages. |
| [LEDGER\_SECTION\_CAPS](/api/@rulvar/plan/variables/LEDGER_SECTION_CAPS.md) | Appendix A per-section caps. |
| [PLAN\_HASH\_VERSION](/api/@rulvar/plan/variables/PLAN_HASH_VERSION.md) | The hashVersion whose profile computes planHash today. |
| [PLAN\_REVISE\_SCHEMA](/api/@rulvar/plan/variables/PLAN_REVISE_SCHEMA.md) | The plan_revise parameter schema (normative). |
| [PLAN\_REVISE\_TOOL\_NAME](/api/@rulvar/plan/variables/PLAN_REVISE_TOOL_NAME.md) | - |
| [PLAN\_SCOPE](/api/@rulvar/plan/variables/PLAN_SCOPE.md) | The single sequential scope holding every plan-mutating entry, inside the orchestrator's run scope: total order = ordinal order = durable append order. Child node scopes are `plan/NodeId` (core `planNodeScope`). |
| [PLAN\_VIEW\_SCHEMA](/api/@rulvar/plan/variables/PLAN_VIEW_SCHEMA.md) | plan_view takes no parameters. |
| [PLAN\_VIEW\_TOOL\_NAME](/api/@rulvar/plan/variables/PLAN_VIEW_TOOL_NAME.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [agentTypeOfRequest](/api/@rulvar/plan/functions/agentTypeOfRequest.md) | - |
| [applyAppliedOp](/api/@rulvar/plan/functions/applyAppliedOp.md) | Applies ONE applied op to the working state. The applier consumes recorded outcomes; op-level legality was decided at rebase time and is never re-evaluated here. Exported for the rebase engine, which applies each op of a revision against the state already changed by the earlier applied ops of the same revision. |
| [applyDecisionOps](/api/@rulvar/plan/functions/applyDecisionOps.md) | The shared plan.decision applier core: engine authorship happens at the fold head under PlanWriteLock, so the producer can PREVIEW the resulting state (and its planHashAfter) before appending, and the fold re-applies the recorded ops identically on replay. |
| [applyPlanEntry](/api/@rulvar/plan/functions/applyPlanEntry.md) | THE single applier: folds one plan-scope entry into the state. Replay consumes recorded outcomes (the APPLIED diff), never re-runs rebase, and timers do not run; hash verification runs under the entry's own hashVersion profile. |
| [applyTaskSpecPatch](/api/@rulvar/plan/functions/applyTaskSpecPatch.md) | Applies an amend_task patch onto a spec (undefined fields untouched). |
| [assertPlanHead](/api/@rulvar/plan/functions/assertPlanHead.md) | The append-time head assertion: planHashBefore of the entry being appended MUST equal the current fold head. A failure is an engine bug and raises the typed PlanInvariantError; the run finishes with outcome error, never a silent brick. |
| [assertPlanTransition](/api/@rulvar/plan/functions/assertPlanTransition.md) | Asserts one status transition against the closed machine. Op-level legality (which ops may request which transitions in which state) is the rebase conflict table's job (M7-T04); the machine itself enforces exactly the structural rules: |
| [boundLedgerRender](/api/@rulvar/plan/functions/boundLedgerRender.md) | Deterministic render bound: over budget, rows drop oldest-first, auto-derived joins before authored sections, and the mission brief slices last; every drop is a FLAGGED discrepancy line. A pure function of (view, budget): a re-executed wake turn renders byte-identical bounded bytes from the same pinned fold. |
| [buildPlanTools](/api/@rulvar/plan/functions/buildPlanTools.md) | Builds the PlanRunner tools (appended to the mode (c) toolset). |
| [canonicalLadderOf](/api/@rulvar/plan/functions/canonicalLadderOf.md) | Canonicalizes the profile's declared ladder once per dispatch site. |
| [canonicalPlanState](/api/@rulvar/plan/functions/canonicalPlanState.md) | The canonical JSON projection of PlanState: nodes sorted by NodeId plus the guard fold counters, nothing else. |
| [cassetteAdapter](/api/@rulvar/plan/functions/cassetteAdapter.md) | - |
| [chainEffortOf](/api/@rulvar/plan/functions/chainEffortOf.md) | The profile's chain effort feeding canonicalization, when declared. |
| [clampStartTier](/api/@rulvar/plan/functions/clampStartTier.md) | Clamps the orchestrator's `model_hint.startTier` to the declared ladder: the hint is the ONLY model influence the orchestrator has, and it never names a model. |
| [decisionOriginOf](/api/@rulvar/plan/functions/decisionOriginOf.md) | The plan.decision origin of one resolvedBy value. |
| [depsSatisfied](/api/@rulvar/plan/functions/depsSatisfied.md) | Dependency satisfaction, derived purely in the fold and NEVER a record: a dep is satisfied when waived or when its upstream node is `done`. Terminally unsuccessful upstreams (cancelled, failed) keep blocking: such edges "remain blocking" per the rewire_deps row of the conflict table, and waive_dep exists exactly to unblock them. |
| [effectiveDroppedStreak](/api/@rulvar/plan/functions/effectiveDroppedStreak.md) | The streak RevisionGuards consume. |
| [emptyPlan](/api/@rulvar/plan/functions/emptyPlan.md) | The empty plan every fold starts from. |
| [emptyPlanFold](/api/@rulvar/plan/functions/emptyPlanFold.md) | - |
| [engineWith](/api/@rulvar/plan/functions/engineWith.md) | - |
| [escalationDecisionKey](/api/@rulvar/plan/functions/escalationDecisionKey.md) | Content key: one authoritative decision per report (decide-once). |
| [executingRungOf](/api/@rulvar/plan/functions/executingRungOf.md) | The rung an attempt executes on: the clamped start tier plus the journaled raise count, hard-clamped at the top rung. `rungIndex` per lineage is strictly monotone; there are no demotions. |
| [exportLedger](/api/@rulvar/plan/functions/exportLedger.md) | - |
| [foldLedger](/api/@rulvar/plan/functions/foldLedger.md) | Fold every ledger.op plus the auto-derived joins up to `uptoSeq`. |
| [gateVerdictKey](/api/@rulvar/plan/functions/gateVerdictKey.md) | Content key of one gate verdict: attempt plus gate position. |
| [isTerminalPlanStatus](/api/@rulvar/plan/functions/isTerminalPlanStatus.md) | - |
| [judgePrompt](/api/@rulvar/plan/functions/judgePrompt.md) | The judge prompt: artifact-grounded, assembled from journaled values only (the attempt's output summary and artifact index), so a replayed judge dispatch hashes identically. |
| [ladderOfProfile](/api/@rulvar/plan/functions/ladderOfProfile.md) | Extracts the declared ladder from an agent profile: the ModelSpec union carries it (`model: { ladder }`), or the loop-role routing entry. The same declaration points feed ladderLengthOf and the frozen kMax, so admission and execution can never disagree on the ladder length. |
| [ladderTriggerOf](/api/@rulvar/plan/functions/ladderTriggerOf.md) | Classifies a settled attempt into the typed transition trigger: schema-mismatch errors are 'schema-exhausted'; the engine's no-progress abort is first-class 'no-progress' (it rides status 'limit' with the dedicated abort class, distinct from user cancellation by construction); cancelled, escalated, and skipped never trigger. 'verify-failed' comes from the acceptance gates, never from the terminal status. |
| [ladderVerdictKey](/api/@rulvar/plan/functions/ladderVerdictKey.md) | Content key of one ladder verdict: the judged attempt is unique. |
| [ledgerCapViolation](/api/@rulvar/plan/functions/ledgerCapViolation.md) | Section-cap check for one authored op (Appendix A). |
| [ledgerOpKey](/api/@rulvar/plan/functions/ledgerOpKey.md) | The content key of one authored op (ordinal distinguishes repeats). |
| [ledgerSufficiency](/api/@rulvar/plan/functions/ledgerSufficiency.md) | Compaction sufficiency: the orchestrate role may compact aggressively only when the ledger measurably suffices (at least one authored revision recorded and a minimum fact count); otherwise the engine falls back to conservative summarize. |
| [normalizeAdaptiveJournal](/api/@rulvar/plan/functions/normalizeAdaptiveJournal.md) | Normalizes one journal for cassette comparison: ULIDs and sha256 strings map to first-appearance placeholders; wall clock, spans, and transcript refs collapse to fixtures. Deterministic given a deterministic entry stream. |
| [orchestratePlanned](/api/@rulvar/plan/functions/orchestratePlanned.md) | The PlanRunner entry surface: mode (c) plus the extension in one call. `runOptions` are the ordinary engine RunOptions of the created run: `runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree, immutable after start, while `opts.budget` only shapes the orchestrator's own sub-account inside it (v1.18.0 review P1-5). |
| [parkDispositionOf](/api/@rulvar/plan/functions/parkDispositionOf.md) | - |
| [planDecisionKey](/api/@rulvar/plan/functions/planDecisionKey.md) | - |
| [planHash](/api/@rulvar/plan/functions/planHash.md) | planHash under one deriver profile (default: the current hashVersion 2 profile). Replay recomputes each entry's planHashAfter with the predicate of that entry's OWN hashVersion, so the deriver is a parameter, not an ambient. |
| [planRevisionKey](/api/@rulvar/plan/functions/planRevisionKey.md) | Content keys: plan.revision keys over {kind, base, requestedOps}; plan.decision over {kind, origin, ops, causeRef}. Cosmetics (rationale) never enter a key; ordinal within scope "plan" distinguishes repeats, so forward-matching works without kernel changes. |
| [planRunner](/api/@rulvar/plan/functions/planRunner.md) | Builds the PlanRunner orchestrator extension. Attach via `orchestrate(engine, goal, { extension: planRunner(o) })` or the `orchestratePlanned` convenience surface. |
| [promptSpecHashOf](/api/@rulvar/plan/functions/promptSpecHashOf.md) | The deterministic spec digest entering PlanNode.promptSpecHash: the canonical JSON of the full TaskSpec through the frozen hashVersion 2 canonicalization. A plan-internal digest, not a kernel content key: the paid-call identity stays with the child's own spawn entry. |
| [readPlanDecision](/api/@rulvar/plan/functions/readPlanDecision.md) | Reads a plan.decision entry's payload. |
| [readPlanRevision](/api/@rulvar/plan/functions/readPlanRevision.md) | Reads a plan.revision entry's payload (tolerant of foreign journals). |
| [rebasePlanRevision](/api/@rulvar/plan/functions/rebasePlanRevision.md) | Steps 2-4 of the committed algorithm: base validation, sequential per-op conflict resolution against the mutating head, and the post-revision counter update. Pure: the caller owns the lock, the append, and every effect. |
| [recomputePlanReadiness](/api/@rulvar/plan/functions/recomputePlanReadiness.md) | Recomputes the derived pending/ready boundary after a fold step: every schedulable node (currently pending or ready) becomes `ready` when its deps are satisfied and `pending` otherwise. rewire_deps may regress a ready node to pending; upstream `done` transitions and waives promote pending to ready. All other statuses are untouched. Returns the same plan object when nothing changed, so fold steps stay cheap. |
| [resolvedByOf](/api/@rulvar/plan/functions/resolvedByOf.md) | Maps a resolution `by` value onto the decision's resolvedBy field. |
| [runAmendVsRunningThenCancelAdd](/api/@rulvar/plan/functions/runAmendVsRunningThenCancelAdd.md) | amend-vs-running-then-cancel-add (DEF-8): amend_task on a running node drops node_running; the next revision cancels it and adds the amended prompt as a NEW node continuing the SAME logical task; the abandon covers the old branch and replay repays neither. |
| [runBadBaseStreakTerminates](/api/@rulvar/plan/functions/runBadBaseStreakTerminates.md) | bad-base-streak-terminates (DEF-8): three consecutive revisions with a fabricated base.planHash land as all-dropped bad-base entries; the dropped streak reaches its limit and the non-HITL RevisionGuards fallback (finish-with-partial) closes the run. |
| [runBudgetDeniedRung](/api/@rulvar/plan/functions/runBudgetDeniedRung.md) | budget-denied-rung: the budget guard denies the rung respawn; the denial journals as termination.denied strictly before the verdict and the ladder takes its declared fallback path. |
| [runCapFreezeThenFinish](/api/@rulvar/plan/functions/runCapFreezeThenFinish.md) | cap-freeze-then-finish (DEF-7): the soft boundary crossed with live children; the cap decision precedes its effects; admitted nodes run to completion; the final quiescence wake gets the finish-only toolset; outcome ok with forcedFinish. |
| [runClaimExclusivityAndChain](/api/@rulvar/plan/functions/runClaimExclusivityAndChain.md) | claim-exclusivity-and-chain (DEF-5): one revision adds TWO identical tasks; the first grafts (exclusive claim), the second admits fresh; the grafted node is severed and the key added a third time: the link points at the chain head and the drain is transitive, oldest first; oscillationCount for the key reaches 2. |
| [runClassStormSingleTurn](/api/@rulvar/plan/functions/runClassStormSingleTurn.md) | class-storm-single-turn (DEF-2): five dependency-chained workers each escalate (Flavor A); the orchestrator resolves all five in ONE revision; the class-level decision carries five per-lineage debits in one entry. Store-independence (identical fold on JSONL and SQLite) is asserted by the replay suite over the frozen bytes. |
| [runCombinedLoopDescent](/api/@rulvar/plan/functions/runCombinedLoopDescent.md) | combined-loop-descent (DEF-2): a verify-failed gate raises the ladder rung; the raised rung hits its turn limit at the top (trigger 'limit') and the node fails; the failure wakes a replan that decomposes the work into two depth-1 children; one child completes and the other escalates until its escalationUnits deny; Phi strictly decreases on every debiting entry and matches the embedded balances. |
| [runConfigDriftResume](/api/@rulvar/plan/functions/runConfigDriftResume.md) | config-drift-resume (DEF-2): life 1 runs under maxRevisionsPerRun 2 and crashes at the pre-append kill point of its second revision; life 2 resumes with the knob DOUBLED. Balances continue from the journaled termination.init (the live config is ignored), a termination:config-drift event fires, and nothing is repaid. |
| [runCrashAfterAppendBeforeEffects](/api/@rulvar/plan/functions/runCrashAfterAppendBeforeEffects.md) | crash-after-append-before-effects (DEF-8): the kill lands immediately after the durable plan.revision carrying add_task x2 plus cancel_task on a running node; the resume re-issues the effects: both children spawn live exactly once and the cancel lands. |
| [runCrashBetweenCapAndEffects](/api/@rulvar/plan/functions/runCrashBetweenCapAndEffects.md) | crash-between-cap-and-effects (DEF-7): process death right after the cap decision entry, before any of its effects; resume re-derives the frozen state from the entry and rolls the forced finish forward. |
| [runCrashBetweenLinkAndRoot](/api/@rulvar/plan/functions/runCrashBetweenLinkAndRoot.md) | crash-between-link-and-root (DEF-5): the full-reuse scenario is cut strictly AFTER the durable node.link and BEFORE the by-ref root; the resume rolls forward: the link forward-matches, the root is re-issued, and nothing is paid twice. |
| [runCrashDuringRevision](/api/@rulvar/plan/functions/runCrashDuringRevision.md) | crash-during-revision: process death INSIDE the revision window, at the pre-append kill point: life 1 is truncated strictly BEFORE the second plan.revision entry; life 2 re-issues the revision live and rolls its effects forward. |
| [runDecomposeMintsChildren](/api/@rulvar/plan/functions/runDecomposeMintsChildren.md) | decompose-mints-children (DEF-3): an escalation decomposition mints FRESH logical tasks inside the decision entry; the spawn debits ride the same entry. |
| [runEscalationStormFrozen](/api/@rulvar/plan/functions/runEscalationStormFrozen.md) | escalation-storm-frozen (DEF-7 set): three Flavor B escalations while the plan is frozen at the cap; each resolves through its journaled defaultDecision and the lineage counters hold. The branches CHAIN via dependencies so exactly one deadline timer is live at a time: the journal byte order stays deterministic (DEF-4 already guarantees the fold; the cassette asserts bytes). |
| [runFinalizeFallbackSynthesized](/api/@rulvar/plan/functions/runFinalizeFallbackSynthesized.md) | finalize-fallback-synthesized (DEF-7): the final finish fails inside its turn limit; the engine journals orchestrator_finalize_fallback and synthesizes the deterministic partial by pure fold; outcome exhausted with the non-null value. |
| [runGraftPartialSubtree](/api/@rulvar/plan/functions/runGraftPartialSubtree.md) | graft-partial-subtree (DEF-5): the three-rung limit ladder is severed mid-top-rung after two completed rung attempts; the byte-identical re-add grafts (exclusive link), the completed rung attempts forward-match through the scope alias, and only the interrupted rung reruns live, exactly once. |
| [runHalfEscalatedLadder](/api/@rulvar/plan/functions/runHalfEscalatedLadder.md) | half-escalated-ladder: some rungs terminal, the active rung dangling mid-attempt at the crash; resume continues the ladder without repaying completed rungs. |
| [runIntraRevisionSelfConflict](/api/@rulvar/plan/functions/runIntraRevisionSelfConflict.md) | intra-revision-self-conflict (DEF-8): one revision {cancel_task X, amend_task X, rewire_deps with an edge onto X} resolves strictly in submission order per the sequential intra-revision application semantics. |
| [runKbPinReplay](/api/@rulvar/plan/functions/runKbPinReplay.md) | kb-pin-replay: the pin at admission and the repin at the wake, card bytes embedded, model names withheld. |
| [runKbProposeQuarantine](/api/@rulvar/plan/functions/runKbProposeQuarantine.md) | kb-propose-quarantine: injected garbage in a proposal is inert, and nothing commits during the run. |
| [runKbRepinExpiry](/api/@rulvar/plan/functions/runKbRepinExpiry.md) | kb-repin-expiry: the repin re-applies the claim filters against a FRESH read; a claim the store dropped between the pin and the wake stops steering, while the boot pin's bytes stand. |
| [runLegacyJournalResume](/api/@rulvar/plan/functions/runLegacyJournalResume.md) | legacy-journal-resume (DEF-3): a journal whose spawns carry no lineage records (the pre-lineage shape) resumes on the current engine; the legacy spawns canonize onto deterministic 'legacy:' LTIDs, forward matching pays nothing for them, and the NEW lineage-declaring spawn's admission entry carries sigVersion 1. |
| [runOscillationBounded](/api/@rulvar/plan/functions/runOscillationBounded.md) | oscillation-bounded (DEF-2): an escalated branch is cancelled and re-added byte-identically twice; every plan_revise call debits one revisionUnit (including the drop on the linked done node), each link debits one spawnUnit, the worker is paid exactly once, and the lineage counters never reset. |
| [runOscillationFreeze](/api/@rulvar/plan/functions/runOscillationFreeze.md) | oscillation-freeze: the coarse-signature oscillation detector freezes further re-adds under hysteresis (distinct from the per-key osc_guard reject). |
| [runOscillationFullReuse](/api/@rulvar/plan/functions/runOscillationFullReuse.md) | oscillation-full-reuse (DEF-5): a branch whose escalated-terminal root is severed by cancel_task and re-added byte-identically links reuse_full: the verdict is embedded in the plan.revision, the node.link (mode full, claim shared) and the by-ref root are present, the reused subtree costs zero live calls, and reclaimedUsdAtLink equals the donor spend. |
| [runOscillationGuardTrip](/api/@rulvar/plan/functions/runOscillationGuardTrip.md) | oscillation-guard-trip (DEF-5): the third re-add of one SpawnKey at maxOscillationsPerKey 2 rejects osc_guard as a typed plan_revise error; the run closes through the non-HITL path and the embedded verdicts replay identically. |
| [runParkRacesChildCompletion](/api/@rulvar/plan/functions/runParkRacesChildCompletion.md) | park-races-child-completion (DEF-8): park_task lands on a running node whose terminal appends moments later; parkRequested is extinguished by the child-result transition, no checkpoint is written, and the node is done. |
| [runParkUnpark](/api/@rulvar/plan/functions/runParkUnpark.md) | park-unpark: park of a running node with checkpoint retention, later unpark and continuation. The worker pays one tool turn, hangs in its second, parks at the boundary, and the unparked continuation resumes from the retained checkpoint (the booted history carries the paid turn). |
| [runQueueFailoverDuringForcedFinish](/api/@rulvar/plan/functions/runQueueFailoverDuringForcedFinish.md) | - |
| [runRaceTimeoutVsLive](/api/@rulvar/plan/functions/runRaceTimeoutVsLive.md) | race-timeout-vs-live (DEF-2): a Flavor B deadline resolution and a live class decision race on one suspension; first-wins applies the timeout, the live attempt lands as a noop, and exactly ONE escalationUnits debit exists. Store-independence is asserted by the replay suite. |
| [runReserveSurvivesRunExhaustion](/api/@rulvar/plan/functions/runReserveSurvivesRunExhaustion.md) | reserve-survives-run-exhaustion (DEF-7): cheap workers eat the run ceiling until admission rejects the spawn that would invade the committed finalize reserve; the final wake executes from the reserve and the rejections forward-match on replay. |
| [runRespawnPreservesCounter](/api/@rulvar/plan/functions/runRespawnPreservesCounter.md) | respawn-preserves-counter (DEF-3): the worker escalates, the orchestrator respawns the SAME logical task with an amended prompt (new content key, same LTID) twice; the third escalation exceeds maxEscalationsPerLogicalTask, is denied on escalationUnits, and the run closes through the non-HITL fallback with identical verdicts and statsBefore on replay. |
| [runReviseMidRun](/api/@rulvar/plan/functions/runReviseMidRun.md) | revise-mid-run: a plan revision arrives while a worker subtree is mid-flight. The first worker HANGS until the revision cancels it; the added replacement completes. |
| [runReviseRacingDefaultDecision](/api/@rulvar/plan/functions/runReviseRacingDefaultDecision.md) | revise-racing-defaultDecision (DEF-8, mandatory): while the orchestrator sleeps, the upstream Flavor B timeout resolves a node done, a second node escalates, and a third completes; the wake submits ONE stale-based revision {waive_dep, park_task, cancel_task} whose trio drops with the exact reasons and the blockingRef pointing at the defaultDecision resolution. |
| [runRevisionExhaustion](/api/@rulvar/plan/functions/runRevisionExhaustion.md) | revision-exhaustion (DEF-2): the absolute revision budget hits zero; termination.denied precedes the typed error; the guards chain closes the run without HITL. |
| [runRewordedLessonsCollide](/api/@rulvar/plan/functions/runRewordedLessonsCollide.md) | reworded-lessons-collide (DEF-3): two attempts of one LTID whose prompts differ but whose signature inputs are identical and share the 'binary-search' tag; the engine computes equal approachSig values, lesson_add keys once, and plan_view groups both attempts into one approach. |
| [runRungRetryLineage](/api/@rulvar/plan/functions/runRungRetryLineage.md) | rung-retry-lineage (DEF-3): the ladder raise continues the SAME logical task with relation rung-retry; attemptsUsed counts both rungs. |
| [runStallStreakClassesAndPinning](/api/@rulvar/plan/functions/runStallStreakClassesAndPinning.md) | stall-streak-classes-and-pinning (DEF-3): four attempts of one LTID land transient-error, task-error, no-progress, and ok; the pinned admission snapshots show stallStreak 0, 1, 2 and the post-ok pinned view shows 0; a wake turn re-executed after a crash reads the SAME LineageStats from its snapshot, not a fresh fold. |
| [runWorktreeDisposedDegrade](/api/@rulvar/plan/functions/runWorktreeDisposedDegrade.md) | worktree-disposed-degrade (DEF-5): a worktree-isolated graft donor whose tree was NOT retained degrades to a fresh admit with the embedded DedupNote graft_unsafe; a second section verifies reuse_full stays allowed for a worktree donor whose root is terminal (the pin condition applies to grafts only). |
| [settled](/api/@rulvar/plan/functions/settled.md) | - |
| [unparkPlacementOf](/api/@rulvar/plan/functions/unparkPlacementOf.md) | - |
| [wouldCreateDepCycle](/api/@rulvar/plan/functions/wouldCreateDepCycle.md) | Cycle check for rewire_deps (a resulting cycle drops the WHOLE op with dep_cycle; rewire_deps is atomic). Answers whether the graph with `nodeId`'s deps replaced by `deps` contains a cycle reachable from `nodeId`. add_task cannot create cycles (nothing depends on a node that does not exist yet), so the check is rewire-only. |
