# Open questions

- Status: Ready for implementation
- Version: 0.2.0-docs
- Date: 2026-07-06
- Purpose: the append-only OQ register: every open engineering question with its interim normative rule, and the founder-only decisions, each with an owner and a closing milestone.

## 1. Register format

Each open question has a permanent ID (OQ-nn, never renumbered, never reused) and the fields:

- Statement: what is undecided.
- Why open: why the decision is deferred rather than committed now.
- Owner: who closes it. Two values are used: "founder" (a decision only the founder can make) and "dogfood telemetry" (closed by measured evidence from implementation and dogfood runs, executed by engineering).
- Must close by: the milestone (M0-M12 per 10-implementation-plan.md) by which the question MUST be resolved.
- Decision trigger: the concrete event or data that forces or enables the decision.
- Interim rule: the normative rule in force until the OQ closes, cross-linked to the spec section carrying it. Where the interim rule is itself normative, implementations MUST follow it.

Closing an OQ follows the change process in section 4.

## 2. Register index

| ID | Title | Owner | Must close by |
|---|---|---|---|
| OQ-01 | PlanRunner versus phase-chaining threshold | dogfood telemetry | post-1.0 (carried at M9-T05) |
| OQ-02 | Class-level escalation correlation key | dogfood telemetry | M7 |
| OQ-03 | invalidate/retry safety boundary | dogfood telemetry | post-1.0 (carried at M9-T05) |
| OQ-04 | renderBudgetTokens measure | dogfood telemetry | Closed at M10 entry (character measure) |
| OQ-05 | startTier demotion signals | dogfood telemetry | post-M11 (v2 planning) |
| OQ-06 | Canary fingerprint design | dogfood telemetry | Closed at M11-T04 (fixed probes, NFC normalization, sha256) |
| OQ-07 | Org-level knowledge store overlay | dogfood telemetry | post-release (carried at M11-T06) |
| OQ-08 | Knowledge card renderBudget sizing | dogfood telemetry | post-release calibration (carried at M11-T06) |
| OQ-09 | Phase-3 value-checkpoint quantitative criteria | dogfood telemetry | Closed at M11-T06 (gate criteria defined); measured 2026-07-11 and remeasured 2026-07-12: FAILED, M12 stays closed; a criterion-2 rule-shape question is with the founder |
| OQ-10 | TaskClass extension mapping to eval tags | dogfood telemetry | post-release (carried at M11-T06) |
| OQ-11 | Editorial-note rendering for judge and orchestrate roles | dogfood telemetry | Closed at M10-T03 (render, no suppression) |
| OQ-12 | ModelKnowledge taskClass binding | dogfood telemetry | Closed at M10-T05 (author-declared, unclassified default) |
| OQ-13 | Checkpoint and transcript blob format | dogfood telemetry | Closed at M9-T05 |
| OQ-14 | LedgerExport JSON schema | dogfood telemetry | M12 |
| OQ-15 | No-progress detector heuristic | dogfood telemetry | Closed at M9-T05 (default frozen) |
| OQ-16 | HTTP server auth and SSE reconnection | dogfood telemetry | M8 |
| OQ-17 | Distributed cross-process rate limiter | dogfood telemetry | M8 |
| OQ-18 | Subprocess and container executor spec | dogfood telemetry | Closed at M9-T05 (no L0 seam) |
| OQ-19 | Process-global rate limiting | dogfood telemetry | M8 |
| OQ-20 | Retention, GC, and cascade delete | dogfood telemetry | M8 (M9 revisit done; defaults carried post-1.0) |
| OQ-21 | Resume binding residuals | dogfood telemetry | M5 |
| OQ-22 | Redaction defaults | dogfood telemetry | M8 |
| OQ-23 | License and contribution model | founder | Closed 2026-07-11 (Apache-2.0; DCO) |
| OQ-24 | Final naming and trademark resolution | founder | Closed 2026-07-11 (renamed rulvar; rulvar.com) |
| OQ-25 | Runtime boundaries | founder | Closed at M9-T05 |
| OQ-26 | Hosting ambitions | founder | M8 |
| OQ-27 | Governance and scope ownership | founder | Closed at M9-T05 |
| OQ-28 | Live contract-test and eval sweep budget | founder | Partially resolved 2026-07-11 ($15 one-off for the M12 checkpoint; recurring cadence deferred) |
| OQ-29 | OpenAI Responses auxiliary state parameters under manual item replay | dogfood telemetry | M1 (re-verified from M5) |

## 3. Engineering open questions

### OQ-01: PlanRunner versus phase-chaining threshold

- Statement: at what workload threshold does a run actually require PlanRunner instead of the documented default, the phase chain.
- Why open: a numeric rule (rather than "many similar tasks") needs dogfood telemetry: fan-out width, failure frequency, re-scoping depth.
- Owner: dogfood telemetry.
- Must close by: M9.
- Decision trigger: telemetry from M6-M8 dogfood runs, including the H-OrchShare instrumentation (01-requirements.md, section "Hypotheses").
- Interim rule: phase chaining is the documented default; PlanRunner and the adaptive machinery are opt-in for wide fan-out that cannot wait for a phase boundary. See 00-overview.md, section "Orchestration modes" and 07-adaptive-orchestration-spec.md, section "Scope and applicability per mode".
- Carried (M9-T05, 2026-07-10): no numeric threshold is committed at 1.0 (dogfood volume is insufficient for a defensible number); the interim rule stays normative and the question re-owns to post-1.0 dogfood telemetry. No frozen SPI surface depends on the answer.

### OQ-02: Class-level escalation correlation key

- Statement: a class-level EscalationDecision needs a report-correlation key (candidate: EscalationKind plus a blocker signature); it is undecided how to guarantee that "one root cause" does not merge semantically different failures.
- Why open: no validated signature scheme exists; committing one prematurely risks a single class decision silently swallowing distinct failures.
- Owner: dogfood telemetry.
- Must close by: M7.
- Decision trigger: EscalationProtocol implementation and the first wide multi-child dogfood runs in M6-M7.
- Interim rule: class-level decisions exist as specified in 07-adaptive-orchestration-spec.md, section "EscalationProtocol"; any candidate correlation key includes at least EscalationKind, so a class decision never spans reports of different kinds; the full key is uncommitted.

### OQ-03: invalidate/retry safety boundary

- Statement: whether the invalidate/retry API for unpinning a memoized failed entry needs an explicit safety boundary, so that the case "the external API recovered overnight" does not require mutating the prompt, yet the API does not open a path to silent plan regeneration.
- Why open: tension between ergonomic retry of long-transient failures and the never-pay-twice and decision-entry disciplines (I1, I2).
- Owner: dogfood telemetry.
- Must close by: M9 (before the SPI freeze).
- Decision trigger: dogfood resumes exercising invalidate/retry after it lands in M2.
- Interim rule: invalidate/retry is explicit, journaled, and targets a single memoized failed entry; there is no bulk or implicit invalidation. See 03-journal-spec.md, section "Replay predicate".
- Carried (M9-T05, 2026-07-10): invalidate/retry is public API governed by semver, not one of the six frozen seams; the interim rule stays normative and the safety-boundary refinement re-owns to post-1.0 dogfood.

### OQ-04: renderBudgetTokens measure

- Statement: the model-independent measure for render budgets (WakeDigest, ledger render): character count versus one bundled tokenizer.
- Why open: characters are simple and deterministic but coarse; a bundled tokenizer buys injection-budget accuracy at the cost of a dependency and cross-model inaccuracy anyway.
- Owner: dogfood telemetry.
- Must close by: M7 (needed for WakeDigest coalescing; concrete budget values for the knowledge card stay TBD-before-M10 per 06-execution-spec.md, Appendix A).
- Decision trigger: measured render sizes from M6-M7 dogfood (the wake-render-size metric, 09-observability-testing-spec.md, section "Metrics").
- Interim rule: interim direction, not committed: a character-based measure (deterministic, dependency-free). See 07-adaptive-orchestration-spec.md, section "WakeDigest".
- Closed (M10 entry, 2026-07-10): the measure is CHARACTERS, model-independent and dependency-free; de facto decided at M7 (the renderBudgetChars knob, frozen into the M7 cassettes) and formalized here. The bundled-tokenizer alternative is rejected for v1: it would still be cross-model-inaccurate and adds a dependency. The committed budget values live in 06-execution-spec.md, Appendix A; their calibration stays with OQ-08.

### OQ-05: startTier demotion signals

- Statement: which signals, robust to clustering of input difficulty, would justify startTier demotion, and what shape a v2 return of runtime startTier promotion takes.
- Why open: naive demotion punishes a model for a hard input batch; the answer's direction is set by ModelKnowledge (a deterministic promotion table from eval-measured claims), but the details are open.
- Owner: dogfood telemetry.
- Must close by: post-M11 (v2 planning; outside the current milestone map).
- Decision trigger: ModelKnowledge phase 2 eval-measured claims available (M11).
- Interim rule: no runtime promotion or demotion exists in v1 (EXC registry, 01-requirements.md, section "Exclusions"); startTier comes from configuration and from knowledge-card recommendations clamped to one rung (05-model-knowledge-spec.md, section "Read path").

### OQ-06: Canary fingerprint design

- Statement: the composition of the probe set, the normalization of nondeterministic outputs at temperature 0, and the acceptable false-stale rate for the model canary fingerprint.
- Why open: no measured probe-stability data exists yet.
- Owner: dogfood telemetry.
- Must close by: M11.
- Decision trigger: the M11 canary fingerprint implementation task.
- Interim rule: the fingerprint's role (modelEpoch honesty and staleness detection) is fixed in 05-model-knowledge-spec.md, section "Grounding and decay"; its design parameters are uncommitted.
- Closed (M11-T04, 2026-07-10): the committed v1 design: the probe set is CALLER data (a fixed, versioned prompt list plus the agent profile it runs under); probes run sequentially through the ordinary engine (journaled, budgeted, VCR-recordable) at the temperature-0 posture; normalization is NFC, trim, and whitespace collapse per output; the fingerprint is the sha256 over the probe count plus the normalized output array, so a probe-set edit never collides with drift. Drift flips the model's ACTIVE eval-measured claims to stale via the mark_stale op (docs/05 section 3, amended at M11-T04); claims without a recorded fingerprint have no baseline and stay untouched (the documented no-probe posture whose insurance is the 30-day negative-claim TTL). The acceptable false-stale RATE stays a telemetry observation, not a design parameter: re-measured by the sweeps that staleness itself triggers.

### OQ-07: Org-level knowledge store overlay

- Statement: whether an optional read-only organization-level ModelKnowledgeStore overlay over the per-project file is warranted, or two-store composition is premature for v1.x.
- Why open: no multi-project usage evidence.
- Owner: dogfood telemetry.
- Must close by: M11.
- Decision trigger: phase-1 (M10) adoption feedback across more than one project.
- Interim rule: a single per-project file store, rulvar.models.json. See 05-model-knowledge-spec.md, section "Data model".
- Carried (M11-T06, 2026-07-10): the decision trigger (phase-1 adoption feedback across more than one project) has not fired: every release is founder-deferred, so no external adoption exists. The single per-project file store stays normative; the overlay re-owns to post-release adoption data.

### OQ-08: Knowledge card renderBudget sizing

- Statement: the exact renderBudget of the model knowledge card relative to the WakeDigest and ledger render budgets.
- Why open: requires measuring the context tax on real phase-1 runs.
- Owner: dogfood telemetry.
- Must close by: M11 (an initial value MUST be committed before M10 ships; calibration closes the OQ).
- Decision trigger: phase-1 (M10) run telemetry.
- Interim rule: renderBudget values are listed as TBD-before-M10 in 06-execution-spec.md, Appendix A; the card render itself is deterministic and bounded (05-model-knowledge-spec.md, section "Read path").
- Status (M10 entry, 2026-07-10): initial values COMMITTED in 06-execution-spec.md, Appendix A (WakeDigest 400 chars per outputSummary row, adopting the implemented distillation cap unchanged; ledger_read render 65536 chars; KB card 4096 chars) per the TBD-before-M10 rule. The OQ stays open for the M11 calibration against phase-1 run telemetry.
- Carried (M11-T06, 2026-07-10): the calibration trigger (phase-1 run telemetry) has not fired: every release is founder-deferred and no dogfood phase-1 runs exist. The committed initial values stand; calibration re-owns to post-release telemetry (the wake-render-size metric of docs/09 feeds it).

### OQ-09: Phase-3 value-checkpoint quantitative criteria

- Statement: the quantitative criteria of the phases 1-2 measured-value checkpoint that gates M12: what measured shift in rung selection and agentType selection quality on eval cases justifies enabling kb_propose.
- Why open: the measurement baseline does not exist until phases 1-2 run.
- Owner: dogfood telemetry.
- Must close by: end of M11 (the gate definition must exist before M12 can be scheduled).
- Decision trigger: M11 matrix sweep results.
- Interim rule: M12 remains gated and carries no version assignment (10-implementation-plan.md, section "Post-1.0 track"; 05-model-knowledge-spec.md, section "Phases and placement").
- Closed (M11-T06, 2026-07-10): the gate DEFINITION exists; M12-T01 executes it. The measured-value checkpoint passes only when BOTH hold, measured by A/B matrix sweeps (card-informed versus no-card baseline) through @rulvar/evals under identical fixed pools, on an eval-case set spanning at least three taskClasses and at least two declared ladders with n >= 20 per (ladder, taskClass) cell:
  1. Rung selection: runs admitted WITH the compiled verified layer reach a pass rate at least equal to the default-start-tier baseline at no more than 90 percent of its cost, OR at least 5 points of pass rate above it at no more than its cost, in a majority of cells and on the pooled aggregate.
  2. agentType selection: the card-informed orchestrator's spawn choices on the same cases match or beat the no-card baseline pass rate at no more than 105 percent of its cost on the pooled aggregate.
  A failed checkpoint keeps M12 closed and appends the measured data to this record; passing is journaled as the dated docs/05 and docs/14 amendment the M12 entry criteria require.
- Measured (M12-T01, 2026-07-11): FAILED; M12 stays closed and unversioned. Six live runs under the one-off $15 OQ-28 grant; runs 1 to 5 each surfaced an instrument or engine defect, fixed and merged before the verdict run (the Haiku 4.5 caps entry and the criterion-2 vacuous-pass guard, PR #107; the Haiku 4.5 effort scrub, PR #108; orchestrated-arm budget solvency, PR #109; the constrained-decoding schema scrub, PR #110; ladder declarers excluded from the spawn vocabulary, PR #111). The verdict run (corpus: 30 seed plus 60 eval cases over extraction, code-edit and judging; ladders swift and deep, Haiku 4.5 to Sonnet 5 at medium and high effort, startTier 1; orchestrated pool n=10; run spend $4.19):
  - Criterion 1 (rung selection): HOLDS. Both recommended cells passed (extraction on both ladders: pass rate 100.0 percent, equal to baseline, at 33 percent of its cost, $0.0239 against $0.0728 per cell) and the pooled aggregate holds. The card produced no recommendation for the code-edit and judging cells (neutral under the majority rule; the seeding sweep measured no strength crossing the 0.85 threshold there).
  - Criterion 2 (agentType selection): FAILS on the cost bar. Card-informed 90.0 percent at $1.7533 against baseline 90.0 percent at $1.5242 (n=10): equal quality at 115 percent of baseline cost, above the 105 percent bar. The card bytes ride every orchestrator turn and did not steer spawns toward cheaper workers enough to pay for themselves.
  - Consequence: kb_propose and the proposal loop stay unshipped; M12-T02 through M12-T04 do not start. Reopen trigger: a fresh grant or the OQ-28 recurring budget decision funds a rerun, preferably after a card change aimed at the measured failure (a per-profile spawn-cost hint, or a leaner orchestrate-role render).
- Remeasured (M12-T01 reopening, 2026-07-12): FAILED under the standing rule; M12 stays closed. The reopening shipped three fixes first, each found by the gate itself: the profile-evidence card section (PR #114, docs/05 4.3), ladder declarers out of the spawn vocabulary (PR #111), and the orchestrator admission reserve pinned to its effectiveCap (PR #116, docs/07 12.2), after a probe journal proved NO orchestrated child had ever been admitted under the case ceilings (both arms had been measuring a self-solving orchestrator). With children actually running, two full runs measured (reports: docs/checkpoints/2026-07-12-m12-value-checkpoint-reopened.md; run spend $1.59 each, about $3.3 of the second grant left):
  - Criterion 1 (rung selection): HOLDS, fifth consecutive full run (extraction on both ladders: equal pass rate at a third of the cost; pooled holds).
  - Criterion 2 (agentType selection): the card-informed arm beat the baseline pass rate by 40 points (run 8: 100.0 against 60.0 percent) and by 20 points (run 9: 80.0 against 60.0 percent), at 107.9 and 106.6 percent of baseline cost, missing the 105 percent bar by $0.0095 and $0.0051. Verdict per the rule as defined: FAILS.
  - Rule-shape observation for the owner: criterion 2 has no quality branch (criterion 1 does), and the baseline's failures are CHEAP (a wrong cheap-worker verdict costs less than a right careful one), so the cost bar tightens exactly when the card is winning on quality. The informed overhead is structurally the card bytes riding each orchestrator turn plus the pricier correct worker. Whether the rule gains a quality branch is the founder's decision; any amendment is a new dated record here, and this verdict stands as measured under the rule in force.


### OQ-10: TaskClass extension mapping to eval tags

- Statement: how user-defined TaskClass extensions map onto eval-case tags without fragmenting the sweep matrix and losing comparability of n.
- Why open: no external extension exists yet to design against.
- Owner: dogfood telemetry.
- Must close by: M11.
- Decision trigger: the first external TaskClass extensions during phases 1-2.
- Interim rule: the TaskClass vocabulary is aligned with the role floors (05-model-knowledge-spec.md, section "Data model"); unmapped extensions and unclassified spawns receive no card recommendations.
- Carried (M11-T06, 2026-07-10): the decision trigger (the first external TaskClass extensions) has not fired: no release has shipped, so no external extension exists. The interim rule stays normative (M11 sweeps key cells by the declared taskClass string verbatim, so a custom class sweeps cleanly when its author supplies cases); cross-project comparability of n re-owns to post-release evidence.

### OQ-11: Editorial-note rendering for judge and orchestrate roles

- Statement: whether to render editorial notes for the judge and orchestrate roles, where the claim describes the model reading the card itself, or to suppress self-description.
- Why open: no evidence on whether self-description helps or biases those roles.
- Owner: dogfood telemetry.
- Must close by: M10 (card render rules ship with phase 1).
- Decision trigger: the phase-1 card render implementation and its first dogfood use.
- Interim rule: tier-relative rendering; the orchestrator never sees model names (05-model-knowledge-spec.md, section "Read path"); the self-description question is unresolved within that rule.
- Closed (M10-T03, 2026-07-10): editorial notes RENDER for every taskClass, including judging and planning; no self-description suppression exists. Rationale: the card is tier-relative and nameless, so a model cannot identify itself in it, which structurally blunts the self-description bias the question feared; suppression would instead hide legitimate judge-steering and planner-steering knowledge from spawn decisions. If phase-2 telemetry shows a measurable self-description bias despite the anonymity, a render rule amendment is ordinary spec evolution (the card is engine-rendered, not a frozen seam).

### OQ-12: ModelKnowledge taskClass binding

- Statement: how a spawn acquires a TaskClass, that is, the binding between AgentProfile/TaskSpec and the (model, effort, taskClass) claim key.
- Why open: the classification source (author-declared, profile-derived, or inferred) is undecided; this is a phase-1 blocker.
- Owner: dogfood telemetry.
- Must close by: M10 (blocks ModelKnowledge phase 1).
- Decision trigger: the M10 design review of the read path.
- Interim rule (normative): an optional taskClass field on AgentProfile and TaskSpec, defaulting to unclassified; card recommendations do not apply to unclassified spawns. See 05-model-knowledge-spec.md, section "Phases and placement".
- Closed (M10-T05, 2026-07-10): the interim rule IS the phase-1 resolution: the classification source is AUTHOR DECLARATION (the optional taskClass on AgentProfile and TaskSpec; spawn_agent params carry it too), absence means unclassified and stores no literal string. A declared class journals inside the spawn-admission decision and the plan.revision spec of record, and rides the dispatch spec, so the M11 recommendation compiler and matrix sweeps consume it from journals; that compiler MUST apply card recommendations only to classified spawns. Floors stay profile-driven per docs/04 (the byTaskClass axis activates on the profile's declared class). Profile-derived or inferred classification is post-phase-1 evolution and would reopen as a new OQ.

### OQ-13: Checkpoint and transcript blob format

- Statement: whether the checkpoint and transcript blob formats become publicly specified, or stay engine-internal.
- Why open: premature freezing would bind compaction and history-projection evolution; no external consumer exists yet.
- Owner: dogfood telemetry.
- Must close by: M9 (SPI freeze decides the public/internal boundary).
- Decision trigger: the M9 SPI audit and any community store or tooling demand.
- Interim rule (normative): blobs are engine-internal; every blob starts with a leading format byte reserved for future migration; stores treat payloads as opaque (contract A4). See 03-journal-spec.md, sections "Checkpoints" and "Storage SPI".
- Closed (M9-T05, 2026-07-10): blob formats stay ENGINE-INTERNAL at 1.0 behind the opaque-payload contract; publishing a format later is additive documentation, never a seam change. See 03-journal-spec.md, section "Checkpoints".

### OQ-14: LedgerExport JSON schema

- Statement: the final JSON schema of LedgerExport.
- Why open: its main consumer (the ModelKnowledge inbox, phase 3) is not designed yet; freezing now would bind M12.
- Owner: dogfood telemetry.
- Must close by: M12 (when the knowledge inbox consumes it).
- Decision trigger: the phase-3 inbox design.
- Interim rule (normative): LedgerExport is draft-versioned (a version discriminator is mandatory); the authored LedgerOp vocabulary is final: brief_set, fact_add, fact_supersede, lesson_add, observation_add. See 07-adaptive-orchestration-spec.md, section "RunLedger".

### OQ-15: No-progress detector heuristic

- Statement: the exact heuristic of the no-progress abort class.
- Why open: any threshold needs tuning against real agent traces to avoid killing slow-but-progressing agents.
- Owner: dogfood telemetry.
- Must close by: M9 (the default freezes before 1.0; the mechanism ships in M3).
- Decision trigger: dogfood traces from M3 onward.
- Interim rule (normative): the detector is engine-defined and journaled as a first-class abort class (a decision entry written before its effects, per I2), with a conservative default: N turns without tool calls or artifact deltas. See 06-execution-spec.md.
- Closed (M9-T05, 2026-07-10): N = 3 consecutive turns without tool calls or artifact deltas FREEZES as the 1.0 default; the per-run knob (UsageLimits) stays configurable and richer heuristics are ordinary post-1.0 evolution behind it. See 06-execution-spec.md, Appendix A.

### OQ-16: HTTP server auth and SSE reconnection

- Statement: authentication for createServer, and the SSE reconnection contract (replay window sizing, whether any built-in auth helper ships).
- Why open: hosts differ too much for one auth scheme; SSE replay sizing needs real traffic.
- Owner: dogfood telemetry.
- Must close by: M8.
- Decision trigger: the M8 server implementation and soak.
- Interim rule (normative): authentication is explicitly out of scope in v1; hosts wrap the server with their own middleware. SSE resume uses Last-Event-ID mapped to the event seq (the per-run telemetry counter, 09-observability-testing-spec.md, section "Event stream").

### OQ-17: Distributed cross-process rate limiter

- Statement: whether and how to coordinate provider rate limits across processes in queue mode.
- Why open: a distributed limiter is a large dependency surface; it is an explicit exclusion in v1, but the recommended operational pattern is unvalidated.
- Owner: dogfood telemetry.
- Must close by: M8 (the limitation must be documented when queue mode ships).
- Decision trigger: the M8 multi-worker soak.
- Interim rule (normative): no distributed limiter ships (EXC registry, 01-requirements.md); queue-mode documentation recommends dividing the provider quota per worker or fronting an external gateway.

### OQ-18: Subprocess and container executor spec

- Statement: the specification of the subprocess and container executors, which are tasked with containing hostile code.
- Why open: no containment mechanism exists yet; the documented posture is honestly downgraded to plans. The candidate direction: specify at least subprocess (stdin/stdout JSON protocol, timeout, cwd from the IsolationProvider) and move container to a plugin behind an ExecutorProvider seam in L0.
- Owner: dogfood telemetry.
- Must close by: M9 (if an ExecutorProvider seam is to exist in L0, it must be decided before the freeze).
- Decision trigger: the M9 SPI audit; demand for machine-script containment beyond the worker sandbox.
- Interim rule (normative): executors inprocess | subprocess | container are declared capabilities; the containment posture is downgraded to plans (08-tools-permissions-spec.md, section "Executors"); the worker sandbox is a determinism and blast-radius boundary, not a security boundary (01-requirements.md, security posture NFR).
- Closed (M9-T05, 2026-07-10): NO ExecutorProvider seam ships in L0 at 1.0; the frozen seam list stays the six of 02-architecture.md. Subprocess and container executors are post-1.0 work behind a future ADDITIVE seam. See 08-tools-permissions-spec.md, section "Executors".

### OQ-19: Process-global rate limiting

- Statement: whether to add a per-adapter process-global limiter (concurrency plus a TPM window) spanning all engines and runs in one process.
- Why open: per-provider concurrency keys are per-engine, while provider limits apply per account; the minimum viable shape needs evidence.
- Owner: dogfood telemetry.
- Must close by: M8.
- Decision trigger: multi-engine or multi-run dogfood hitting provider limits.
- Interim rule: per-provider concurrency keys are per-engine only (04-model-layer-spec.md, section "Router and resolution chain"); no process-global limiter is committed.

### OQ-20: Retention, GC, and cascade delete

- Statement: retention and garbage collection: whether delete(runId) must cascade over TranscriptStore (or the engine performs the cascade via list(runId)), an optional retention policy at the server/queue layer, and pruning of intermediate checkpoints after an agent's terminal entry.
- Why open: the EXECUTED interim rules cover cascade delete, the retention hook, and ok-terminal checkpoint pruning; automatic retention defaults (TTLs, size budgets) and GC scheduling still need storage-growth data from dogfood.
- Owner: dogfood telemetry.
- Must close by: M8 (interim rules executed at M8-T04); defaults revisit at M9 with the SPI freeze.
- Decision trigger: observed storage growth in dogfood.
- Interim rule (normative, EXECUTED at M8-T04): the cascade is engine-side: `TranscriptStore.delete(ref)` exists (03-journal-spec.md, section "TranscriptStore") and `Engine.deleteRun(runId)` deletes every blob `list(runId)` returns, then the journal, leaving no orphan transcripts; `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that no other entry references; the server and the queue worker take an optional `retention` predicate over RunMeta and apply deleteRun to settled runs it selects (02-architecture.md, section "Shells overview"). No automatic retention runs by default: stores persist indefinitely unless the host opts in.
- M9 revisit (M9-T05, 2026-07-10): the M8-T04 executed rules stand unchanged; no automatic retention defaults ship at 1.0; TTL and size-budget defaults re-own to post-1.0 storage-growth data.

### OQ-21: Resume binding residuals

- Statement: residuals of the run-to-definition binding contract: the strictness of the mismatch policy for in-process workflows (warn versus refuse) and the exact persistence home of generated source for planned runs (TranscriptStore versus RunMeta).
- Why open: the right strictness depends on how often benign edits break the body contentHash in practice.
- Owner: dogfood telemetry.
- Must close by: M5 (CLI resume ships).
- Decision trigger: the M2 resume implementation and the M5 CLI.
- Interim rule (normative): the binding contract in 06-execution-spec.md, section "Engine and ops API": for a CompiledWorkflow the source and its hash are persisted at run start; for an in-process Workflow the registered name and the body contentHash are recorded in RunMeta, with a loud warning on mismatch at resume; the rulvar resume contract is documented in the same section.

### OQ-22: Redaction defaults

- Statement: redaction of secrets and sensitive data outside VCR cassettes: the planned L0 serialization hook (redact/encrypt at the append and put boundaries, symmetric on load and get), the default key-masking policy, and the OTel attribute content policy.
- Why open: the EXECUTED interim rules ship the hook seam, the default event masking, and the OTel statement; the masking pattern set needs tuning against real dogfood payloads, and stored-content encryption defaults (key management, at-rest posture) remain undesigned.
- Owner: dogfood telemetry.
- Must close by: M8 (interim rules executed at M8-T04, before the server and OTel export expose persisted data beyond the process); pattern-set revisit before 1.0.
- Decision trigger: dogfood payloads and any missed-credential report.
- Interim rule (normative, EXECUTED at M8-T04): the serialization hook exists (`createEngine({ serialization })`, docs/03 section "Serialization hook": symmetric on load/get, one policy point through Engine.stores, plaintext journal by default because replay is the product); every emitted WorkflowEvent passes the default key-masking policy (`maskSecrets`, opt out via `redaction.maskEvents: false`; docs/06 Appendix A row "event secret masking"); the OTel attribute content policy is restated normatively and the exporter masks string attributes with the same policy (09-observability-testing-spec.md, section "Redaction and sensitive data").

### OQ-29: OpenAI Responses auxiliary state parameters under manual item replay

- Statement: verification of the auxiliary state parameters that current OpenAI model docs require preserving across manual-state Responses requests (for example the gpt-5.5 `phase` parameter): which parameters exist on the July 2026 surface, whether verbatim provider-raw echo suffices, and whether any of them interacts with `store: false` plus `include: ['reasoning.encrypted_content']`.
- Why open: the surface is documented sparsely and only observable against the live API; the answer may change with provider releases.
- Owner: dogfood telemetry.
- Must close by: M1 (the @rulvar/openai adapter ships in M1-T13; re-verified by the M5 cron contract tests).
- Decision trigger: M1-T13 live smoke tests and the recorded adapter fixtures.
- Interim rule (normative): any such parameter is retained verbatim as a provider-raw part and echoed byte-exact on subsequent requests, exactly like reasoning items; nothing is dropped or normalized (04-model-layer-spec.md, section "Manual item replay only").

## 4. Founder-only decisions

Tracked here but not engineering-ruled: no interim engineering rule can close them.

### OQ-23: License and contribution model

- Statement: the license choice (MIT or Apache-2.0 with its patent clause, versus protective options), CLA or DCO for contributions, and the re-export policy for provider SDKs inside the first-class adapters.
- Why open: founder decision; not yet made.
- Owner: founder.
- Must close by: M9 (the 1.0 gate: the license MUST be decided before the first public release).
- Decision trigger: the pre-release legal review at the M9 gate (12-release-versioning.md, section "The 1.0 gate").
- Interim rule (normative): every relevant surface carries "License: TBD (decided before first public release)"; no doc or package includes license text (README.md, section "License").
- Status (M9-T05, 2026-07-10): the founder DEFERRED the license decision; per the 1.0 gate (12-release-versioning.md, section "The 1.0 gate", item 3) the v1.0.0 release is blocked until it lands. The interim rule stays in force; the M9 engineering scope is complete independent of it.
- Closed (2026-07-11, founder): the license is **Apache-2.0**, applied repo-wide (the root LICENSE, a LICENSE copy in every package, `"license": "Apache-2.0"` in every manifest; 12-release-versioning.md, section "License", rewritten). The contribution model is DCO with copyright retained by the project owner; provider SDK re-exports remain ordinary dependencies under their own licenses. Gate item 3 of the 1.0 gate is SATISFIED; together with the OQ-24 rename this unblocks the v1.0.0 release.

### OQ-24: Final naming and trademark resolution

- Statement: final resolution of the project name. The question tracked the FORMER working name's contingencies (its unscoped npm slot was squatted by an abandoned 2014 GPLv3 package, its GitHub org name was held by an unrelated account since 2008, and no formal trademark clearance had run), which together held the v1.0.0 release at the M9 gate.
- Why open: founder decision (branding, domain, and clearance).
- Owner: founder.
- Must close by: the final name and trademark resolution (or a consciously carried contingency) by the 1.0 gate.
- Decision trigger: the release-gate review.
- Interim rule (normative): docs reference packages uniformly as @rulvar/<name>; the canonical naming note is 13-toolchain-repo.md, section "Naming note".
- Status (M9-T05, 2026-07-10): the founder HELD v1.0.0 until clearance; the contingency continued on the former name.
- Closed (2026-07-11, founder): the project is RENAMED to **rulvar** with the official domain **rulvar.com**, dissolving every contingency of the former name. Verified at close: the unscoped npm name and the @rulvar scope are unpublished (registry 404s) and no GitHub user or org holds "rulvar"; the repository is github.com/o-stepper/rulvar. The v1.0.0 naming hold (gate item 4 of 12-release-versioning.md, section 5) LIFTS. Every frozen fixture was re-recorded under the new name in the renaming change (journaled workflow names and content keys embed it; the catalog and dogfood journals are byte-frozen again post-rename). Formal USPTO/EUIPO registration remains an optional post-release protection step on the founder's release checklist, no longer a release blocker.

### OQ-25: Runtime boundaries

- Statement: whether the core is fixed as TypeScript/Node long-term, the support status of Bun, Deno, and edge runtimes, and whether a Python port is planned.
- Why open: founder decision; the answer shapes the SPI forms and the 1.0 freeze timing.
- Owner: founder.
- Must close by: M9 (before the SPI freeze).
- Decision trigger: the M9 SPI audit.
- Interim rule: the committed engineering baseline is Node >=22.12.0, ESM-only, per 13-toolchain-repo.md, section "Committed toolchain"; no support statement exists for Bun, Deno, or edge runtimes.
- Closed (M9-T05, 2026-07-10, founder): the core is TypeScript on Node, ESM-only, Node >=22.12.0 at 1.0; no Bun/Deno/edge support statement ships (one MAY be added post-1.0 as an additive, tested claim); no Python port is planned. The SPI forms froze under this boundary. See 13-toolchain-repo.md, section "Runtime: Node >=22.12.0, developed on Node 24".

### OQ-26: Hosting ambitions

- Statement: pure library versus a commercial hosted layer (dashboard, control plane, telemetry).
- Why open: founder decision; it determines the priority of the server/queue mode, the default telemetry policy, and the monetization model.
- Owner: founder.
- Must close by: M8 (it shapes the server and queue milestone).
- Decision trigger: M8 planning.
- Interim rule: library-only posture; shells are optional and build only on public APIs (I6; 02-architecture.md, section "Shells overview").

### OQ-27: Governance and scope ownership

- Statement: personal project, company, or neutral foundation; who owns the npm scope; who merges community adapters and stores, and the quality policy for them under the shared brand.
- Why open: founder decision; not yet made.
- Owner: founder.
- Must close by: M9 (community adapter and store guides land in M9).
- Decision trigger: the M9 ecosystem work.
- Interim rule: single-maintainer operation; community guides are deferred to M9 (10-implementation-plan.md).
- Closed (M9-T05, 2026-07-10, founder): personal project with a single maintainer who owns the npm scope and repository; community adapters and stores live in third-party repositories and claim compatibility via the executable conformance kits and guides; nothing third-party merges into the @rulvar scope. See 13-toolchain-repo.md, section "Contributor workflow".

### OQ-28: Live contract-test and eval sweep budget

- Statement: cron-scheduled cassette runs against paid provider APIs cost real money monthly and require API keys: whose keys, what spending cap, and whether the founder accepts the standing adapter-maintenance tax. Includes the fixed, rate-capped sweep budget pool for the future ModelKnowledge phases.
- Why open: founder decision on recurring spend and key ownership.
- Owner: founder.
- Must close by: M5 (cron contract tests ship in M5).
- Decision trigger: the M5 CI setup for live contract tests.
- Interim rule: cassettes replay deterministically in CI without live keys; live cron runs are blocked on this decision (11-testing-strategy.md, section "Cassette tier").
- Status (2026-07-11, founder): a ONE-OFF grant of $15 on the founder's own Anthropic key funds the M12 measured-value checkpoint (OQ-09; the runner enforces per-run engine ceilings and a cumulative $12 script guard). The RECURRING budget for cron live contract tests, canary probes, and scheduled sweeps stays consciously deferred: the cassette tier remains the only CI truth, and the question reopens when the founder commits a standing monthly cap.
- Status (2026-07-11, founder, second grant): $11 remaining on the key funds the OQ-09 gate REOPENING after the profile-evidence card amendment (docs/05, 4.3): probes plus one verdict run plus one variance repeat. The per-invocation script guard tightens to $6. The recurring budget stays deferred.

## 5. Change process

Closing an open question REQUIRES a docs amendment PR that:

1. updates the owning spec section with the committed rule (spec-first: merged before any code that depends on the decision, per README.md, section "Docs versioning and amendment process");
2. updates this register: the OQ keeps its ID and gains a Closed status line with the decision, the date, and a pointer to the owning spec section;
3. never reuses or renumbers an OQ ID.

New open questions are appended with the next free number. An OQ whose interim rule is normative MUST NOT be silently contradicted by any spec; a conflict is a documentation defect.
