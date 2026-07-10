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
| OQ-04 | renderBudgetTokens measure | dogfood telemetry | M7 |
| OQ-05 | startTier demotion signals | dogfood telemetry | post-M11 (v2 planning) |
| OQ-06 | Canary fingerprint design | dogfood telemetry | M11 |
| OQ-07 | Org-level knowledge store overlay | dogfood telemetry | M11 |
| OQ-08 | Knowledge card renderBudget sizing | dogfood telemetry | M11 |
| OQ-09 | Phase-3 value-checkpoint quantitative criteria | dogfood telemetry | end of M11 (gates M12) |
| OQ-10 | TaskClass extension mapping to eval tags | dogfood telemetry | M11 |
| OQ-11 | Editorial-note rendering for judge and orchestrate roles | dogfood telemetry | M10 |
| OQ-12 | ModelKnowledge taskClass binding | dogfood telemetry | M10 (phase-1 blocker) |
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
| OQ-23 | License and contribution model | founder | M9 (1.0 gate) |
| OQ-24 | Final naming and trademark resolution | founder | M0 (scope claim) / M9 (final) |
| OQ-25 | Runtime boundaries | founder | Closed at M9-T05 |
| OQ-26 | Hosting ambitions | founder | M8 |
| OQ-27 | Governance and scope ownership | founder | Closed at M9-T05 |
| OQ-28 | Live contract-test and eval sweep budget | founder | M5 |
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

### OQ-07: Org-level knowledge store overlay

- Statement: whether an optional read-only organization-level ModelKnowledgeStore overlay over the per-project file is warranted, or two-store composition is premature for v1.x.
- Why open: no multi-project usage evidence.
- Owner: dogfood telemetry.
- Must close by: M11.
- Decision trigger: phase-1 (M10) adoption feedback across more than one project.
- Interim rule: a single per-project file store, lurker.models.json. See 05-model-knowledge-spec.md, section "Data model".

### OQ-08: Knowledge card renderBudget sizing

- Statement: the exact renderBudget of the model knowledge card relative to the WakeDigest and ledger render budgets.
- Why open: requires measuring the context tax on real phase-1 runs.
- Owner: dogfood telemetry.
- Must close by: M11 (an initial value MUST be committed before M10 ships; calibration closes the OQ).
- Decision trigger: phase-1 (M10) run telemetry.
- Interim rule: renderBudget values are listed as TBD-before-M10 in 06-execution-spec.md, Appendix A; the card render itself is deterministic and bounded (05-model-knowledge-spec.md, section "Read path").

### OQ-09: Phase-3 value-checkpoint quantitative criteria

- Statement: the quantitative criteria of the phases 1-2 measured-value checkpoint that gates M12: what measured shift in rung selection and agentType selection quality on eval cases justifies enabling kb_propose.
- Why open: the measurement baseline does not exist until phases 1-2 run.
- Owner: dogfood telemetry.
- Must close by: end of M11 (the gate definition must exist before M12 can be scheduled).
- Decision trigger: M11 matrix sweep results.
- Interim rule: M12 remains gated and carries no version assignment (10-implementation-plan.md, section "Post-1.0 track"; 05-model-knowledge-spec.md, section "Phases and placement").

### OQ-10: TaskClass extension mapping to eval tags

- Statement: how user-defined TaskClass extensions map onto eval-case tags without fragmenting the sweep matrix and losing comparability of n.
- Why open: no external extension exists yet to design against.
- Owner: dogfood telemetry.
- Must close by: M11.
- Decision trigger: the first external TaskClass extensions during phases 1-2.
- Interim rule: the TaskClass vocabulary is aligned with the role floors (05-model-knowledge-spec.md, section "Data model"); unmapped extensions and unclassified spawns receive no card recommendations.

### OQ-11: Editorial-note rendering for judge and orchestrate roles

- Statement: whether to render editorial notes for the judge and orchestrate roles, where the claim describes the model reading the card itself, or to suppress self-description.
- Why open: no evidence on whether self-description helps or biases those roles.
- Owner: dogfood telemetry.
- Must close by: M10 (card render rules ship with phase 1).
- Decision trigger: the phase-1 card render implementation and its first dogfood use.
- Interim rule: tier-relative rendering; the orchestrator never sees model names (05-model-knowledge-spec.md, section "Read path"); the self-description question is unresolved within that rule.

### OQ-12: ModelKnowledge taskClass binding

- Statement: how a spawn acquires a TaskClass, that is, the binding between AgentProfile/TaskSpec and the (model, effort, taskClass) claim key.
- Why open: the classification source (author-declared, profile-derived, or inferred) is undecided; this is a phase-1 blocker.
- Owner: dogfood telemetry.
- Must close by: M10 (blocks ModelKnowledge phase 1).
- Decision trigger: the M10 design review of the read path.
- Interim rule (normative): an optional taskClass field on AgentProfile and TaskSpec, defaulting to unclassified; card recommendations do not apply to unclassified spawns. See 05-model-knowledge-spec.md, section "Phases and placement".

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
- Interim rule (normative): the binding contract in 06-execution-spec.md, section "Engine and ops API": for a CompiledWorkflow the source and its hash are persisted at run start; for an in-process Workflow the registered name and the body contentHash are recorded in RunMeta, with a loud warning on mismatch at resume; the lurker resume contract is documented in the same section.

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
- Must close by: M1 (the @lurker/openai adapter ships in M1-T13; re-verified by the M5 cron contract tests).
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

### OQ-24: Final naming and trademark resolution

- Statement: final resolution of the project name contingencies. The facts: the unscoped npm name "lurker" is occupied by an abandoned 2014 GPLv3 RSS reader (last published 2014-08-07, 0 downloads per month), so the umbrella package name is contingent on one of three paths: an npm name dispute, a transfer from the current owner, or a fallback name (unscoped "lurkerjs" or "lurker-ai", or shipping the umbrella as @lurker/lurker with no unscoped package). The @lurker scope has zero published packages and is plausibly free, but org availability is unverified and MUST be tested operationally by claiming the npm org, an explicit M0 checklist item, before any name freezes. The GitHub org name "lurker" is unavailable (held by a personal account since 2008), so the repository org will be a variant (lurker-dev, lurkerjs, getlurker). Trademark searches surface no live "Lurker" mark in developer tooling, but formal USPTO/EUIPO clearance in the software classes has not been done and is a pre-1.0 gate. The old unscoped versions remain GPLv3 in the registry, so an unpinned "npm install lurker" today installs the 2014 RSS reader: docs therefore always write install commands against @lurker/<name>.
- Why open: founder decision (name dispute versus transfer versus fallback; branding and domain); risk is noted, not resolved, per the founder's standing decision.
- Owner: founder.
- Must close by: the npm org/scope claim at M0; the final umbrella-name and trademark resolution (or a consciously carried contingency) by M9.
- Decision trigger: the M0 naming checklist outcome (org claim, GitHub org variant selection) and the M9 release-gate review.
- Interim rule (normative): docs reference packages uniformly as @lurker/<name> and never write bare "lurker" in install commands; the canonical naming risk note is 13-toolchain-repo.md, section "Naming risk note".
- Status (M9-T05, 2026-07-10): the founder HOLDS v1.0.0 until formal USPTO/EUIPO clearance completes (gate item 4); the naming contingency continues as the @lurker scope with the umbrella as @lurker/lurker per rule 1.4.1.

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
- Closed (M9-T05, 2026-07-10, founder): personal project with a single maintainer who owns the npm scope and repository; community adapters and stores live in third-party repositories and claim compatibility via the executable conformance kits and guides; nothing third-party merges into the @lurker scope. See 13-toolchain-repo.md, section "Contributor workflow".

### OQ-28: Live contract-test and eval sweep budget

- Statement: cron-scheduled cassette runs against paid provider APIs cost real money monthly and require API keys: whose keys, what spending cap, and whether the founder accepts the standing adapter-maintenance tax. Includes the fixed, rate-capped sweep budget pool for the future ModelKnowledge phases.
- Why open: founder decision on recurring spend and key ownership.
- Owner: founder.
- Must close by: M5 (cron contract tests ship in M5).
- Decision trigger: the M5 CI setup for live contract tests.
- Interim rule: cassettes replay deterministically in CI without live keys; live cron runs are blocked on this decision (11-testing-strategy.md, section "Cassette tier").

## 5. Change process

Closing an open question REQUIRES a docs amendment PR that:

1. updates the owning spec section with the committed rule (spec-first: merged before any code that depends on the decision, per README.md, section "Docs versioning and amendment process");
2. updates this register: the OQ keeps its ID and gains a Closed status line with the decision, the date, and a pointer to the owning spec section;
3. never reuses or renumbers an OQ ID.

New open questions are appended with the next free number. An OQ whose interim rule is normative MUST NOT be silently contradicted by any spec; a conflict is a documentation defect.
