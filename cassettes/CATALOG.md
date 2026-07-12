# Mandatory defect cassette catalog

<!--
  Extracted verbatim from the retired internal spec set (docs/09, section 6)
  when docs/ became the public documentation site (PR #120, 2026-07-12).
  This file is NORMATIVE test infrastructure: scripts/catalog-audit.mjs
  parses the cassette IDs from the tables below and CI fails when an ID
  has no fixture under cassettes/ or named suite. Spec cross-references
  (docs/NN, section ...) in the prose point at the pre-PR-120 git history.
-->

The cassettes below are NORMATIVE test IDs: 11-testing-strategy.md and the milestone exit gates in 10-implementation-plan.md reference them by these exact names. The renderings below are the canonical IDs; any other spelling is a defect. Rules:

- Every cassette MUST pass under replay-strict with zero live calls, except where its contract states an exact expected live-call count (for example resume-v1-with-inserted-call expects exactly one).
- Where a cassette asserts store-independence it MUST run against both reference stores (JsonlFileStore and @rulvar/store-sqlite) with identical fold outcomes.
- Each cassette lands in the milestone that ships its mechanism (task mapping in 10-implementation-plan.md); the complete set green is an M9 (v1.0.0) release gate (12-release-versioning.md, section "The 1.0 gate").
- Synthetic-fixture rule: a cassette that gates a milestone EARLIER than the one shipping its live producers runs there as a synthetic journal fixture: entries hand-authored against the kinds registry v2 and payload schemas frozen in M2, replayed through the kernel via replayRun with a stub workflow. The same ID is re-recorded through the live producers in their shipping milestone, and both forms stay in the suite. The gating table with the synthetic markers is 10-implementation-plan.md, section "Gating cassette sets per milestone".

### 6.1 DEF-1 cassettes (replay predicate and escalated status)

| Cassette | Asserts |
|---|---|
| escalate-replay | worker ends escalated with a report, parent decides respawn; replay-strict resume: zero live calls, byte-identical EscalationReport, decision read from the decision entry |
| crash-between-report-and-decision | crash after the terminal escalated entry but before the decision entry; first resume replays escalated and pays for the decision live exactly once; second resume replays both with zero live calls |
| abandon-subtree | cancel_task plus abandon over a subtree with ok, escalated, and a hanging running entry; replay-strict gives all of them derived skipped, zero live calls, zero spend increment |
| memoize-classifier | two rung spawns with memoizeOutcome: true; first ends with a task-class error (schema mismatch), second with a transport-class error (rate limit); strict replay replays the first and fails exactly on the second as the expected rerun miss |
| flavor-b-timeout | the escalate tool suspends the agent; the timeout appends a resolution by 'timeout'; dispose and the downgrade to terminal escalated run as effects; resume replays the closing resolution and the terminal entry, defaultDecision applies first-wins, no re-suspension |
| v1-journal-on-v2 | a journal without the new statuses and kinds resumes on the v2 engine; all dispositions byte-identical to the round-1 table (regression guard for the scope-independent predicate) |

### 6.2 DEF-2 cassettes (termination account)

| Cassette | Asserts |
|---|---|
| revision-exhaustion | 33 plan_revise calls at V0 = 32: 32 debiting plan.revision entries, then termination.denied with revision_budget_exhausted; the run ends via the terminating fallback; replay-strict byte-for-byte with zero live calls |
| combined-loop-descent | verify-failed raises the rung, a limit produces an escalation, the escalation wakes a replan, a decomposition descends to depth 1, the child escalates and is denied on escalationUnits; Phi strictly decreases on every debiting entry and matches the embedded balances; replay pays nothing |
| config-drift-resume | suspend mid-run, resume with a doubled live maxRevisionsPerRun; balances continue from termination.init, a termination:config-drift event fires, no repayment |
| class-storm-single-turn | five correlated escalations, one class-level decision; five per-lineage debits inside one decision entry; identical fold on JSONL and SQLite |
| oscillation-bounded | two cancel cycles plus a byte-identical re-add; one revisionUnit per plan_revise call, one spawnUnit per link, zero repeated LLM payments, lineage counters never reset |
| race-timeout-vs-live | a timeout defaultDecision races a live resolution; exactly one escalationUnits debit via first-wins, the losing attempt classifies as noop, replay identical on both reference stores |

### 6.3 DEF-3 cassettes (lineage)

| Cassette | Asserts |
|---|---|
| respawn-preserves-counter | a worker escalates twice (kind scope_bigger); the orchestrator respawns the node both times with an amended prompt (new content key, same LTID); the third escalation gets lineage_exhausted and a non-HITL fallback; replay-strict reproduces identical verdicts and statsBefore with zero live calls |
| rung-retry-lineage | a three-rung ladder, verify-failed on the first two; all three attempts share the LTID with attemptOrdinal 0..2; crash after the second rung's verdict; resume forward-matches the first two attempts and pays live only for the third |
| decompose-mints-children | a decision entry debits the parent counter and mints three child LTIDs with ancestry inside its value part; replay reads the same ULIDs from the entry and never re-mints |
| reworded-lessons-collide | two attempts of one LTID with different prompt prose but identical agentType/toolsetHash/schemaHash and the 'binary-search' tag; the engine computes equal approachSig values; lesson_add keys once; plan_view groups the attempts into one approach |
| stall-streak-classes-and-pinning | the sequence transient-error, task-error, no-progress, ok yields stallStreak 0,1,2,0 in pinned snapshots; a wake turn re-executed after a crash reads exactly the same LineageStats from its snapshot, not a fresh fold |
| legacy-journal-resume | a journal recorded before lineage existed resumes; legacy spawns get deterministic 'legacy:' LTIDs, forward-matching pays nothing, new decision entries carry sigVersion 1 |

### 6.4 DEF-4 cassettes (decide-once and abandon)

| Cassette | Asserts |
|---|---|
| timeout-vs-live-race | a Flavor B escalation is suspended with deadlineAt; the journal records the live EscalationDecision winning and the by: 'timeout' attempt landing as noop; replay-strict with zero live calls, noop effects never re-issued |
| class-decision-fanout | a class-level EscalationDecision closes three suspended reports, one of which is already closed individually; the journal holds two applied and one noop resolution with decisionRef; fold state on replay is bit-identical to live |
| abandon-then-crash-then-resume | plan.revision with cancel_task, then abandon over a running branch with two completed children, crash before effects; resume derives skipped for the whole subtree with zero live calls inside it and re-issues only the revision effects; the resume report lists skipped, not orphaned |
| abandon-vs-resolution-race | an external resolution arrives after a covering abandon: noop with target_abandoned and applied: false to the caller; the reverse order yields an applied resolution and a noop abandon |
| offline-invalid-then-valid | offline append of an invalid then a valid resolution; the fold classifies invalid and applied; resume consumes the valid value; replay-strict deterministic (schema pinned by schemaHash) |
| double-abandon-idempotent | two consecutive revisions cancel overlapping subtrees; the second abandon over an already covered target folds to noop; live and replay materialized states identical, no repayment |

### 6.5 DEF-5 cassettes (dedup and reuse-by-reference)

| Cassette | Asserts |
|---|---|
| oscillation-full-reuse | a branch driven to done children, cancel_task, byte-identical re-add: the reuse_full verdict is embedded in plan.revision, the node.link and by-ref root entry are present, zero live calls for the reused subtree, replay-strict passes, reclaimedUsd equals the donor spend |
| graft-partial-subtree | a node with parallel siblings abandoned when two of three are done; re-add of an identical spec: completed siblings forward-match through the alias, the interrupted one reruns live exactly once; the abandoned-spend ledger shows reclaimedUsd equal to the matched prefix spend |
| crash-between-link-and-root | injected crash after the durable node.link append and before the child root entry; resume rolls forward: the link matches, the root entry is re-issued, zero double payment |
| oscillation-guard-trip | a third re-add of the same SpawnKey at maxOscillationsPerKey 2: reject osc_guard, a typed plan_revise error, the non-HITL RevisionGuards fallback; the verdict is embedded and replay takes the same path |
| worktree-disposed-degrade | a donor with worktree isolation whose tree was not retained: verdict admit with DedupNote graft_unsafe; a separate cassette section verifies that reuse_full is still allowed for the same donor's terminal ok root |
| claim-exclusivity-and-chain | one revision adds two identical tasks (the first grafts, the second is fresh); the grafted node is abandoned and the task added a third time: link to the chain head and transitive oldest-first drain; first-wins is deterministic, the drain order is identical live and under replay-strict, oscillationCount for the key equals 2 |

### 6.6 DEF-6 cassettes (hashVersion)

English renderings of the archived names; these are the canonical IDs.

| Cassette | Asserts |
|---|---|
| resume-v1-on-engine-v2 (mandatory) | a frozen round-1 JSONL fixture (agent, step, rand, external, approval; field v: 1) resumes on a v2 engine under replay-strict: zero live calls, all entries consumed under the v1 predicate, normalization never rewrites the store |
| resume-v1-with-inserted-call | the same journal with one call inserted mid-workflow: exactly one live call via FakeAdapter, the new entry carries hashVersion 2 with a correct ordinal, all v1 neighbors forward-match without repayment |
| suspended-v1-resolves-on-v2 | a fixture with a version-1 suspended awaitExternal; resolveExternal on a v2 engine: a version-2 superseding append addressed by seq, schema validation at consumption, zero repeated LLM calls |
| reject-version-too-old | a synthetic hashVersion 0 fixture outside the window: JournalCompatibilityError HASH_VERSION_TOO_OLD with zero live calls, zero appends, zero reserves; a rerun with deriverV0 supplied via extraDerivers resumes normally |
| reject-version-from-future | a fixture containing a hashVersion 3 entry on a v2 engine: HASH_VERSION_TOO_NEW at load and separately at lease acquire in queue mode; no side effects |
| effort-defaults-shift | a v1 fixture recorded without effort; the v2 config sets role effort defaults high/low: all v1 entries match, the pricing and ladder-statistics folds read legacy effort as medium, new entries carry the real effort in identity |

### 6.7 DEF-7 cassettes (orchestrator cap and finalize reserve)

| Cassette | Asserts |
|---|---|
| cap-freeze-then-finish | the soft boundary is crossed with live children; the cap decision precedes its effects, admitted nodes run to completion, the final quiescence wake gets a finish-only toolset, the outcome is ok with forcedFinish: true; replay-strict yields zero live calls and a byte-identical CostReport.orchestrator |
| crash-between-cap-and-effects | kill immediately after the durable orchestrator_budget_cap append; resume re-derives the freeze by fold, no second cap decision, the result matches the crash-free cassette |
| reserve-survives-run-exhaustion | cheap workers eat the run ceiling; admission rejects spawns that would invade committedReserve; the final wake executes from the reserve; the rejections forward-match on replay |
| finalize-fallback-synthesized | finish fails its schema twice and turns are exhausted; orchestrator_finalize_fallback is written and a partial result is synthesized by fold; live and replay-strict assemble an identical value with outcome exhausted |
| escalation-storm-frozen | three Flavor B escalations under a frozen plan; each resolves with an immediate defaultDecision carrying a ref to the cap decision; class-level merging and lineage counters are upheld; zero live calls on replay |
| queue-failover-during-forced-finish | a worker loses its lease between the cap decision and the final wake; a second worker with a new fencing epoch resumes; exactly one cap decision exists, the final agent entry forward-matches, finalization is paid once |

### 6.8 DEF-8 cassettes (plan revision rebase)

| Cassette | Asserts |
|---|---|
| revise-racing-defaultDecision (mandatory) | the orchestrator sleeps on wait_for_events; an upstream escalation timeout appends a resolution and a plan.decision escalation-default marking the node done; a second node escalates; a third completes; the orchestrator wakes on a stale WakeDigest and submits one revision {waive_dep on the resolved dependency, park_task on the just-escalated node, cancel_task on the done node}; expected: exactly one plan.revision with outcomes dropped dep-already-resolved (blockingRef to the defaultDecision resolution), dropped node-escalated, dropped node-already-done; strict replay yields byte-identical outcomes, tool result, and planHash chain |
| crash-after-append-before-effects | kill immediately after the durable plan.revision append containing add_task x2 and cancel_task on a running node; resume: both children spawn live exactly once, the cancel lands; the final journal is equivalent to a crash-free run up to telemetry |
| amend-vs-running-then-cancel-add | amend_task on a running node drops with node-running; the next revision issues cancel_task plus add_task with a new prompt; abandon covers the old branch entries, the new NodeId carries the same logicalTaskId, replay repays neither branch |
| intra-revision-self-conflict | one revision {cancel_task X, amend_task X, rewire_deps with an edge onto X}: applied, dropped terminal-status, and the rewire outcome per the conflict table, strictly in submission order; replay reproduces the sequential intra-revision application semantics |
| bad-base-streak-terminates | three consecutive revisions with a fabricated base.planHash: three all-dropped bad-base entries, droppedRevisionStreak reaches its limit, the non-HITL RevisionGuards fallback fires (finish-with-partial); strict replay walks the same path with no live calls |
| park-races-child-completion | park_task on a running node whose terminal result appends before the park lands; parkRequested is extinguished by the child-result transition, no checkpoint is written, the node is done; replay yields an identical fold and no orphaned flags in the planHash chain |

### 6.9 Round-2 cassette set

Six additional cassettes carried from the round-2 review, complementing the DEF sets. Their names are normalized to kebab-case as test IDs; detailed assertion scripts are owned by 11-testing-strategy.md. Each MUST pass under replay-strict with zero live calls.

| Cassette | Scope |
|---|---|
| revise-mid-run | a plan revision arriving while worker subtrees are mid-flight |
| crash-during-revision | process death inside the revision append/effects window (complements crash-after-append-before-effects with a pre-append kill point) |
| park-unpark | park of a plan node with checkpoint retention, later unpark and continuation; interaction with the worktree pin cap (08-tools-permissions-spec.md, section "IsolationProvider and worktree lifecycle") |
| oscillation-freeze | the oscillation detector freezing further re-adds under hysteresis (distinct from oscillation-guard-trip, which covers the per-key reject) |
| half-escalated-ladder | suspension with a ladder mid-escalation: some rungs terminal, the active rung suspended; resume continues the ladder without repaying completed rungs |
| budget-denied-rung | the budget guard denying a rung attempt; the denial is journaled as a decision entry and the ladder takes its declared fallback path |

### 6.10 M6/M8 substrate and soak set

The mode (c) substrate and multi-process soak cassettes referenced by the M6 and M8 gates (10-implementation-plan.md, section "Gating cassette sets per milestone"; 11-testing-strategy.md, section "Per-milestone exit criteria matrix"). They are catalog members like every other test ID.

| Cassette | Scope |
|---|---|
| sandbox-determinism | two runs of the same CompiledWorkflow under WorkerSandboxRunner produce identical journals (seeded shims, JSON boundary; 06-execution-spec.md, section "Script runners") |
| planner-self-repair | a mode (b) plan whose first draft fails lint round-trips through the self-repair loop within repairRounds and executes deterministically; recorded on FakeAdapter |
| orchestrator-crash-resume | a crashed orchestrate() restores its history from the turn checkpoint and finds child results by content keys, with zero re-paid spawns and no duplicate spawn decisions |
| multi-process-fencing-soak | two workers over SqliteStore with kill/failover across suspension, forced-finish, and plan-revision boundaries: zero split-brain, zero double pay, stale-epoch appends rejected and invisible (complements queue-failover-during-forced-finish) |

### 6.11 ModelKnowledge phase-1 set (M10)

The kb read-path cassettes of docs/05 (sections "Read path" and "Security", channel 8). Recorded offline over a deterministic stub store with time-stable claim dates; catalog members like every other test ID.

| Cassette | Asserts |
|---|---|
| kb-pin-replay | an orchestrate-role run over a configured ModelKnowledgeStore pins the filtered card at admission (kb_pinned with the card bytes embedded, strictly before the first orchestrator agent entry) and repins at the wait_for_events wake (kb_repinned); the card is tier-relative and carries NO model names; replay reads entry bytes only and never touches a live store |
| kb-repin-expiry | the repin re-applies the read-path filters against a FRESH store read: a claim archived (or expired) between the pin and the wake vanishes from the repinned card while the boot pin's bytes stand untouched, so stale claims never steer spawns after pauses |

