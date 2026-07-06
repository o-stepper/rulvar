# Observability and testing specification

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: normative specification of the WorkflowEvent stream, the derived metrics, the OpenTelemetry mapping, RunHandle/RunOutcome/CostReport, the three-tier test harness with the store conformance kit, the mandatory defect cassette catalog, the @lurker/evals package, and the redaction posture.

This document owns the FR-5xx requirement block (registry in 01-requirements.md, section "FR registry") and is the owning spec for goal 7 in 00-overview.md, section "Goals" (observability and testability out of the box). Delivery is spread across milestones (10-implementation-plan.md): the event stream, FakeAdapter, and createTestEngine land in M1 (v0.2.0); replay-strict and @lurker/store-conformance in M2 (v0.3.0); VCR cassettes and cron contract tests in M5 (v0.6.0); @lurker/evals and the complete defect cassette set in M9 (v1.0.0); matrix sweeps, the canary fingerprint, and the eval-committer identity in M11 (v1.2.0). Cassette names defined here are the test IDs consumed by 11-testing-strategy.md.

## 1 Event stream

One discriminated stream of WorkflowEvent values is the single observability surface. It feeds four consumers: RunHandle.events and on() (section 4), the terminal progress renderer (the minimal TUI, M1), the JSONL event log, and the optional OTel exporter (section 3). EventSink is deliberately not an SPI: the event surface is the RunHandle.events / on() public API and there is no pluggable seam to freeze (02-architecture.md, section "SPI seams and the 1.0 freeze").

Events are pure telemetry. No event, field, or ordering of events participates in journal identity (03-journal-spec.md, section "Identity model"); dropping every event MUST NOT change any run outcome.

### 1.1 Envelope

```ts
type WorkflowEvent = {
  runId: string;
  seq: number;           // per-run telemetry counter; see below
  ts: string;            // ISO 8601 wall clock; telemetry only, never identity
  spanId: string;
  parentSpanId?: string;
  replayed?: boolean;    // true only on re-emitted journal-backed events (1.5)
} & WorkflowEventBody;   // the union in 1.4
```

Normative envelope rules:

- `seq` is an independent per-run telemetry counter: it MUST be strictly increasing in emission order within a run and it is distinct from `JournalEntry.seq`. The two sequences MUST NOT be compared or joined; where an event references a journal entry it carries an explicit `entryRef` field holding the journal seq (the canonical EntryRef, 03-journal-spec.md, section "Identity model"). Event `seq` is the resume cursor for SSE delivery (Last-Event-ID mapping; open question in 14-open-questions.md).
- `ts` is wall clock and MAY differ between live and replayed emissions of the same logical event.
- `spanId` values are engine-minted opaque strings, unique per run.

### 1.2 Span hierarchy

Spans form a tree per run with the fixed hierarchy run > phase > agent > tool > child:

- the run has a single root span;
- each `ctx.phase` opens a child span of the run span (or of the enclosing phase span when phases nest);
- each agent invocation opens a child span of the innermost enclosing phase span (or the run span outside any phase); orchestrator wake turns are agent spans;
- each tool call opens a child span of its agent span;
- each child workflow (`ctx.workflow`, plan-node execution, orchestrator handle spawns) opens a child span of the spawning agent span, or of the enclosing phase/run span for direct `ctx.workflow` calls, and becomes the root of that child's own subtree.

spanId is pure telemetry and is excluded from content keys (03-journal-spec.md, section "Identity model"). The tree maps 1:1 onto OTel spans via toOtel (section 3).

### 1.3 Naming convention

Event names follow one convention: `domain:verb`, all lowercase, ASCII. Earlier PascalCase and dotted telemetry names are mapped as follows and MUST NOT appear on the wire:

| Archived name | Canonical event |
|---|---|
| PlanRevised | plan:revised |
| NodeParked | node:parked |
| NodeCancelled | node:cancelled |
| NodeLinked | node:linked |
| OrchestratorWoke | orchestrator:woke |
| orchestrator:budget | orchestrator:budget (unchanged) |
| EscalationRaised | escalation:raised |
| EscalationDecided | escalation:decided |
| SpawnAdmitted | spawn:admitted |
| SpawnRejected | spawn:rejected |
| verify-failed | verify:failed |
| ledger.op | ledger:op |
| stall | stall:detected |
| OscillationGuardTripped | guard:oscillation |
| ResolutionApplied / ResolutionSuperseded | resolution:applied / resolution:superseded |
| termination.debit / termination.denied / termination.config-drift | termination:debit / termination:denied / termination:config-drift |
| journal.compat | journal:compat |

### 1.4 Canonical catalog and payload schemas

The catalog below is closed for v1: new event types MUST be added by amending this section. Payload types referenced by name are owned elsewhere: WireError and error codes in 02-architecture.md, section "Error taxonomy"; Usage and InvocationRole in 04-model-layer-spec.md; AgentStatus, ResolutionPayload, and hashVersion in 03-journal-spec.md; EscalationKind, EscalationDecision, LedgerOp, and admission verdicts in 07-adaptive-orchestration-spec.md; ToolRisk in 08-tools-permissions-spec.md. Every `entryRef` field is a journal seq number. Each variant lists the fields an emitter MUST carry; emitters MAY add fields, and consumers MUST tolerate unknown fields and unknown event types.

Run lifecycle and core telemetry:

```ts
type CoreEvents =
  | { type: 'run:start'; workflow: string; resumed: boolean }
  | { type: 'run:end'; status: 'ok'|'error'|'cancelled'|'exhausted'|'suspended';
      totalUsd: number }
  | { type: 'phase:start'; phase: string }
  | { type: 'log'; level: 'debug'|'info'|'warn'|'error'; msg: string; data?: Json }
  | { type: 'budget:update'; spentUsd: number; remainingUsd: number | null;
      committedReserveUsd: number }
  | { type: 'external:waiting'; key: string; entryRef: number; prompt?: string;
      deadlineAt?: string }
  | { type: 'approval:pending'; toolName: string; entryRef: number;
      deadlineAt?: string }
  | { type: 'child:start'; workflow: string; scope: string }
  | { type: 'child:end'; workflow: string; scope: string; status: AgentStatus };
```

Agent lifecycle:

```ts
type AgentEvents =
  | { type: 'agent:queued'; agentType: string; label?: string }
  | { type: 'agent:start'; agentType: string; label?: string; model: string;
      role: InvocationRole }
  | { type: 'agent:end'; agentType: string; label?: string; status: AgentStatus;
      usage: Usage; costUsd: number; entryRef: number }
  | { type: 'agent:error'; agentType: string; label?: string; error: WireError;
      willRetry: boolean }
  | { type: 'agent:schema-retry'; agentType: string; attempt: number;
      maxAttempts: number }
  | { type: 'agent:stream'; delta: string };   // emitted only when opts.stream
```

`agent:stream` deltas are emitted only when the call opts into streaming and MUST NOT be journaled or re-emitted on replay. `agent:error` reports a live attempt failure; a memoized error outcome replaying under memoizeOutcome surfaces as a replayed `agent:end` with status `'error'`, not as `agent:error`.

Tool lifecycle:

```ts
type ToolEvents =
  | { type: 'tool:start'; toolName: string; risk?: ToolRisk }
  | { type: 'tool:end'; toolName: string; outcome: 'ok'|'error'|'denied';
      durationMs: number };
```

Adaptive orchestration, resolutions, and accounting. These types are emitted only by runs where the corresponding machinery is active (applicability per mode: 07-adaptive-orchestration-spec.md, section "Scope and applicability per mode"):

```ts
type AdaptiveEvents =
  | { type: 'plan:revised'; entryRef: number; planHash: string;
      applied: number; dropped: number; revisionUnitsRemaining: number }
  | { type: 'node:parked'; nodeId: string; logicalTaskId: string }
  | { type: 'node:cancelled'; nodeId: string; logicalTaskId: string }
  | { type: 'node:linked'; nodeId: string; logicalTaskId: string;
      donorRef: number; reclaimedUsd: number }                        // (DEF-5)
  | { type: 'orchestrator:woke'; digestSeq: number; planHash: string;
      coversToOrdinal: number; renderSize: number }
  | { type: 'orchestrator:budget'; entryRef: number; spentUsd: number;
      effectiveCapUsd: number; reserveUsedUsd: number; frozen: boolean } // (DEF-7)
  | { type: 'escalation:raised'; entryRef: number; kind: EscalationKind;
      logicalTaskId: string; costToDateUsd: number }
  | { type: 'escalation:decided'; entryRef: number;
      decision: 'retry'|'decompose'|'cancel'|'accept';
      by: ResolutionPayload['by']; countsAgainstLimit: boolean }
  | { type: 'spawn:admitted'; entryRef: number;
      verdict: 'admit'|'reuse_full'|'admit_graft';  // the admitting arms of the unified AdmitVerdict union (07-adaptive-orchestration-spec.md, section "Unified AdmitVerdict")
      agentType: string; logicalTaskId: string; spawnUnitsAfter: number }
  | { type: 'spawn:rejected'; entryRef: number; code: string;
      agentType: string; logicalTaskId?: string }
  | { type: 'verify:failed'; entryRef: number; logicalTaskId: string;
      rung: number; gate: 'mechanical'|'judge'|'spot-check' }
  | { type: 'ledger:op'; entryRef: number;
      op: 'brief_set'|'fact_add'|'fact_supersede'|'lesson_add'|'observation_add' }
  | { type: 'stall:detected'; logicalTaskId: string; stallStreak: number }
  | { type: 'guard:oscillation'; spawnKeyHash: string;
      oscillationCount: number; limit: number }                       // (DEF-5)
  | { type: 'resolution:applied'; targetRef: number; entryRef: number;
      by: ResolutionPayload['by'] }                                   // (DEF-4)
  | { type: 'resolution:superseded'; targetRef: number; entryRef: number;
      supersededBy: number; reason: 'already_resolved'|'target_abandoned' } // (DEF-4)
  | { type: 'termination:debit'; entryRef: number; counter: string;
      remaining: number; phi: number }                                // (DEF-2)
  | { type: 'termination:denied'; entryRef: number; counter: string;
      code: string }                                                  // (DEF-2)
  | { type: 'termination:config-drift'; field: string; frozenValue: Json;
      liveValue: Json }                                               // (DEF-2)
  | { type: 'journal:compat';
      code: 'HASH_VERSION_TOO_OLD'|'HASH_VERSION_TOO_NEW';
      found: number; window: [number, number] };                      // (DEF-6)

type WorkflowEventBody = CoreEvents | AgentEvents | ToolEvents | AdaptiveEvents;
```

### 1.5 Replay re-emission and the replayed flag

On resume, the engine re-emits events for journal-backed facts it consumes by forward-matching or derives by fold, so that UIs can rebuild the run picture; every such re-emission carries `replayed: true` so consumers can deduplicate. The normative rule: the re-emission set is exactly the journal-backed lifecycle events; stream deltas and live-only scheduling or diagnostic telemetry are NEVER re-emitted.

| Event types | Re-emitted with replayed: true |
|---|---|
| agent:start, agent:end (for entries consumed by replay), child:start, child:end | yes |
| tool:start, tool:end (for tool results reconstructed from a replayed turn checkpoint or transcript) | yes |
| external:waiting, approval:pending (for suspensions still open at resume) | yes |
| plan:revised, node:parked, node:cancelled, node:linked, orchestrator:woke, orchestrator:budget, escalation:raised, escalation:decided, spawn:admitted, spawn:rejected, verify:failed, ledger:op, stall:detected, guard:oscillation, resolution:applied, resolution:superseded, termination:debit, termination:denied | yes |
| agent:stream | never |
| run:start, run:end, phase:start, log, budget:update, agent:queued, agent:error, agent:schema-retry, termination:config-drift, journal:compat | no (live-only; they describe the current process, and phase:start/log fire live again when workflow bodies re-execute) |

Replayed events MUST carry payloads derived from the journaled facts (byte-identical status, usage, cost, verdicts), not from re-evaluation; this is the observable face of the decision-entry principle (I2, 00-overview.md, section "Invariants").

## 2 Metrics

The following metric definitions are normative so that dashboards, dogfood telemetry, and docs agree on one vocabulary. All of them are pure folds over the event stream, the journal, or CostReport; the library ships the definitions and the inputs, not a metrics backend.

| Metric | Definition | Source | Purpose |
|---|---|---|---|
| ledger-ops-per-spawn | count of authored ledger:op events / count of spawn:admitted events, per run | event stream | RunLedger usefulness signal for the PlanRunner-vs-phase-chaining threshold (open question, 14-open-questions.md) |
| wake-render-size | renderSize of each orchestrator:woke event; distribution per run | event stream | WakeDigest render budget sizing; the measure (chars vs tokens) is an open question (14-open-questions.md) |
| escalation rate by agentType | escalation:raised count / spawn count, grouped by agentType | event stream | profile and ladder tuning; feeds eval sweep prioritization |
| orchestrator-share p50/p90 | distribution of CostReport.orchestrator.share across runs | CostReport | validates hypothesis H-OrchShare (01-requirements.md, section "Hypotheses") and drives the capFraction default revisit (DEF-7) |
| abandoned / reclaimed / netLost USD | fold over applied abandon entries and node.link reclaim data: abandonedUsd, reclaimedUsd, netLostUsd = abandoned - reclaimed | journal fold (03-journal-spec.md, section "Abandon, derived skipped, and reuse-by-reference (DEF-5)") | cost of plan churn; oscillation economics (DEF-5) |

## 3 OpenTelemetry mapping

`toOtel(run, tracer)` maps the spanId tree of a run 1:1 onto OpenTelemetry spans: one OTel span per lurker span, parented per section 1.2, with start/end timestamps taken from the corresponding lifecycle events. Events without an own span (log, budget:update, decision-backed telemetry) attach as OTel span events on their enclosing span.

Normative rules:

- `@opentelemetry/api` ^1.9 is an optional peer dependency (13-toolchain-repo.md, section 1). The core has no OTel dependency; the exporter ships in @lurker/cli. When the peer is absent, toOtel MUST be absent or throw a typed ConfigError; nothing else degrades.
- Span attributes use two namespaces: `lurker.*` for library-specific attributes (at minimum lurker.run_id, lurker.scope, lurker.agent_type, lurker.entry_seq where applicable) and `gen_ai.*` semantic conventions for model calls (model id, usage token counts). The gen_ai.* semconv is flagged unstable upstream; the exporter MUST document the exact mapping per release and MAY change it in minor releases without a BREAKING flag, because OTel attribute names are explicitly outside the compatibility surface.
- Attribute content policy: prompts, completions, tool inputs, tool outputs, and provider-raw blocks MUST NOT be exported as span attributes or span events by default. Only identifiers, statuses, usage counters, and cost figures are exported. Content capture, if ever offered, is opt-in and gated on the redaction hook (section 8).
- Replayed events (replayed: true) MUST NOT create duplicate spans; the exporter either skips them or marks them with `lurker.replayed = true` on a single span, at its documented discretion.

## 4 RunHandle, RunOutcome, and CostReport

### 4.1 RunHandle

```ts
interface RunHandle<R> {
  runId: string;
  result: Promise<RunOutcome<R>>;
  events: AsyncIterable<WorkflowEvent>;
  on<T extends WorkflowEvent['type']>(
    type: T,
    cb: (e: Extract<WorkflowEvent, { type: T }>) => void
  ): () => void;                                  // returns unsubscribe
  cancel(reason?: string): Promise<void>;
  resolveExternal(key: string, value: Json): Promise<ResolutionOutcome>; // (DEF-4)
}
```

- `events` yields the full stream from subscription onward; `on` is the callback form; both observe the same stream and the same seq values.
- `cancel` requests cooperative cancellation; the run settles with status `'cancelled'` and a complete CostReport.
- `resolveExternal` returns ResolutionOutcome (owned by 03-journal-spec.md, section "Suspension and resolutions"): `{ applied: true, seq }` when this attempt won the first-closing-wins fold, or `{ applied: false, seq, supersededBy, reason }` when a prior resolution or a covering abandon already closed the target. Repeated resolution is therefore defined behavior, not an error (DEF-4). An invalid live payload throws a typed InvalidResolutionError and journals nothing (02-architecture.md, section "Error taxonomy").

Engine entry points that produce a RunHandle (engine.run, engine.resume, runPlanned, orchestrate) are specified in 06-execution-spec.md, section "Engine and ops API".

### 4.2 RunOutcome

```ts
type RunOutcome<R> = {
  status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
  value?: R;
  error?: WireError;
  dropped: DroppedItem[];      // pipeline drops and onError:'null' losses
  pending: PendingExternal[];  // suspensions still open at settle time
  usage: Usage;
  cost: CostReport;
};
```

- RunStatus adds `'running'` to this vocabulary for in-flight inspection (06-execution-spec.md, section "Engine and ops API").
- `'exhausted'` overrides `'error'`: a run at the budget ceiling reports exhausted with `value` undefined plus dropped/pending and a full CostReport (06-execution-spec.md, section "Three-layer budget").
- `'suspended'` means at least one suspension (awaitExternal, ask approval, Flavor B escalation) is open; `pending` lists them. Under replay-strict a journal whose suspensions are unresolved completes with status suspended and zero live calls (DEF-4).
- `dropped` makes silent losses visible: every pipeline item dropped by onItemError:'drop' and every agent nulled by onError:'null' MUST appear here with its scope and WireError.

```ts
// Both types are owned by 06-execution-spec.md (sections "Error policy and
// dropped results" and "RunOptions, RunHandle, RunOutcome, RunStatus");
// restated here verbatim, never redefined.
type DroppedItem = { source: 'pipeline' | 'agent-onerror-null' | 'parallel-settled';
                     scope: string; entryRef?: number; label?: string;
                     error: WireError };
type PendingExternal = { key: string; scope: string; entryRef: number;
                         prompt?: string; deadlineAt?: string };
```

### 4.3 CostReport

```ts
interface CostReport {
  totalUsd: number;
  byModel: Record<string, number>;      // canonical ModelRef 'adapterId:model'
  byPhase: Record<string, number>;      // ctx.phase names; structural for this map
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;              // (DEF-7)
  orchestrator: {                                       // (DEF-7)
    spentUsd: number;        // orchestrator sub-account spend
    share: number;           // spentUsd / max(totalUsd, epsilon); epsilon 0.01 (06-execution-spec.md, Appendix A)
    wakes: number;           // count of orchestrator wake turns
    forcedFinish: boolean;   // true when the at-cap freeze forced finish
    reserveUsedUsd: number;  // spend drawn from the finalize reserve
  };
  unpriced: Array<{ model: string; usage: Usage }>;
}
```

- Priced amounts are computed under the registry's versioned price table (04-model-layer-spec.md, section "Pricing"). Usage on models absent from the price table MUST be surfaced in `unpriced` and MUST NOT contribute a silent zero to any priced bucket.
- `byRole` and the `orchestrator` block exist in every run; in runs without a dynamic orchestrator the block is all-zero with forcedFinish false. Both were added by DEF-7; the addition is additive but consumers matching keys exhaustively must update (release policy: 12-release-versioning.md).
- `orchestrator.share` is the input to the orchestrator-share metric and hypothesis H-OrchShare (section 2); it uses the same epsilon-floored denominator as the H-OrchShare metric definition, `spentUsd / max(totalUsd, epsilon)` with epsilon 0.01 (06-execution-spec.md, section "The H-OrchShare hypothesis"), so a zero-cost run reports share 0 rather than a division by zero.
- CostReport.byPhase is the reason ctx.phase is structural for cost attribution while remaining cosmetic for journal identity (06-execution-spec.md, section "Canonical Ctx interface").

## 5 Test harness

The harness (@lurker/testing) has three tiers, each falling out of an architectural seam rather than added on: the ProviderAdapter seam gives tiers 1 and 2, the journal gives tier 3. FR-5xx acceptance criteria bind to these tiers; the per-milestone suite gating lives in 11-testing-strategy.md, section "Per-milestone exit criteria matrix".

### 5.1 Tier 1: FakeAdapter and createTestEngine

FakeAdapter is a real ProviderAdapter that resolves calls from declared patterns instead of the network. Patterns match on agentType, label, or a regex over the prompt; `'*'` is the fallback. Responses are static values, strings, or functions of the call, with full type inference against the agent's SchemaSpec.

```ts
const engine = createTestEngine({
  agents: {
    reviewer: (call) => ({ verdict: 'pass' }),
    '*': 'stub text',
  },
});
```

Normative properties:

- Zero network. Unit tests run through the full engine: journal, scheduler, budget layers, permission chain, and event stream are all real, so orchestration logic is exercised, not mocked around.
- Because FakeAdapter sits behind the same seam as live adapters, tests are vendor-neutral by construction.
- FakeAdapter calls cost zero USD. Termination of adaptive runs under FakeAdapter is guaranteed by the integer counters of the TerminationAccount, not by dollars (DEF-2, 07-adaptive-orchestration-spec.md, section "TerminationAccount and the termination lemma"); the defect cassettes rely on this.

### 5.2 Tier 2: VCR cassettes at the adapter boundary

```ts
record({ adapters, cassette, redact? });                       // wraps adapters
replay({ cassette, onMiss: 'throw' | 'passthrough' });
```

- A cassette is a redacted JSONL file of request/response pairs keyed by a hash of the canonical wire-contract request, recorded at the ProviderAdapter boundary. Because the boundary speaks the L0 wire contract, cassettes are vendor-neutral by construction.
- `redact` hooks strip secrets at record time; secret redaction is built in and MUST cover authorization material by default. (The VCR boundary is currently the only place redaction exists; see section 8.)
- `onMiss: 'throw'` makes cassette tests hermetic; `'passthrough'` permits mixed live/recorded runs during development.
- Cassette fixtures record the hashVersion they were produced under (DEF-6); mixed-version replay follows the journal compatibility rules (03-journal-spec.md, section "hashVersion").
- Cron contract tests: the same cassettes are additionally run in CI on a cron schedule against the live provider APIs as adapter contract tests, so provider drift is caught before users hit it. The recurring cost and key ownership of these live runs are a founder-owned open question (14-open-questions.md).

### 5.3 Tier 3: replay-strict journal runs

```ts
replayRun(wf, args, { journal, mode: 'strict' });
```

Replay-strict executes a workflow against an existing journal and throws a typed JournalMissError on ANY live call: zero live calls or loud failure. This turns every production journal into a deterministic integration test and is the enforcement mechanism for the determinism NFR (01-requirements.md). Every defect cassette (section 6) runs under replay-strict; every milestone exits with its cassette set green under replay-strict CI (10-implementation-plan.md, section "Planning rules").

A journal with open suspensions completes under replay-strict with outcome `suspended` and zero live calls (DEF-4).

### 5.4 Matchers

@lurker/testing ships matchers for Vitest 4 and Jest. The minimal set:

```ts
expect(run).toHaveCalledAgent('reviewer', { times: 3 });
expect(run).toStayUnderBudget({ usd: 5 });
```

Matchers operate on the settled RunHandle/RunOutcome and the event stream; they MUST NOT reach into engine internals.

### 5.5 Store conformance kit

@lurker/store-conformance is the executable conformance kit for JournalStore/LeasableStore adapters (DEF-4). Third-party stores MUST pass it; the shipped stores (InMemoryStore, JsonlFileStore, @lurker/store-sqlite) are gated on it in CI.

```ts
export function journalStoreConformance(mk: () => Promise<JournalStore>): ConformanceSuite;
export function leasableStoreConformance(mk: () => Promise<LeasableStore>): ConformanceSuite;
```

Mandatory checks (contract owned by 03-journal-spec.md, section "Storage SPI"; suite composition owned by 11-testing-strategy.md, section "Conformance tier"):

- A1 append atomicity; A2 total per-run order; A3 read-your-writes; A4 opaque payload (a store that reorders, deduplicates, or normalizes entries fails loudly).
- Fencing: an append under a stale fencing epoch is rejected and never appears in load.
- Leasing: acquire on a held lease rejects with a typed LeaseHeldError; renew cadence at most ttl/3.
- Golden fold-state fixtures: identical fold-state hashes across store implementations for the same entry sequence.
- The end-to-end decide-once oracle: a scripted resolution race yields exactly one applied classification, then replays strict.
- The abandon fixture: a skipped subtree yields zero live calls on resume.

## 6 Mandatory defect cassette catalog

The cassettes below are NORMATIVE test IDs: 11-testing-strategy.md and the milestone exit gates in 10-implementation-plan.md reference them by these exact names. The renderings below are the canonical IDs; any other spelling is a defect. Rules:

- Every cassette MUST pass under replay-strict with zero live calls, except where its contract states an exact expected live-call count (for example resume-v1-with-inserted-call expects exactly one).
- Where a cassette asserts store-independence it MUST run against both reference stores (JsonlFileStore and @lurker/store-sqlite) with identical fold outcomes.
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

## 7 @lurker/evals

A separate quality-measurement package built strictly on the public APIs (L6). It ships in M9 (v1.0.0); the round-3 extensions ship in M11 (v1.2.0).

### 7.1 EvalCase and graders

```ts
interface EvalCase {
  workflow: Workflow | CompiledWorkflow;
  args: Json;
  graders: Grader[];
}
```

Three grader families:

- Golden graders compare the run's structured output against committed expected outputs.
- Rubric graders score the output against declared, named criteria with per-criterion verdicts.
- LLM-judge graders ask a judge model for a verdict against a schema.

The judge grader runs through the engine itself as an ordinary judged invocation: judge calls are journaled, budgeted, and VCR-recorded like any other agent call, which makes eval CI deterministic (record once, replay forever). Judge model selection is subject to the judge quality floor: weak defaults for judging are forbidden by the router floors, which no advice, including the knowledge base, can override (04-model-layer-spec.md, section "Role quality floors"). Eval fixtures record their hashVersion (DEF-6).

### 7.2 Config-matrix comparison

Evals compare configuration matrices: profile vs profile, cheap workers vs premium, reviewer on vs off. The report contains pass-rate, cost, and latency per cell, sourced from the existing AgentResult.usage and costUsd fields; no separate measurement channel exists. Deterministic replay of the matrix via VCR is the CI mode (11-testing-strategy.md, section "Eval CI").

### 7.3 Feeding ModelKnowledge (M11)

Round-3 extensions connect evals to the knowledge base (05-model-knowledge-spec.md):

- Matrix sweeps over (workflow x model x taskClass) produce eval-measured claims. Sweep results are committed under a dedicated eval-committer identity, which is the only identity permitted to write eval-measured claims (05-model-knowledge-spec.md, section "Write path").
- The canary model fingerprint detects silent provider-side model changes and gates claim freshness (design open question, 14-open-questions.md); modelEpoch honesty and TTL decay are owned by 05-model-knowledge-spec.md, section "Grounding and decay".
- Falsification sweeps re-test standing claims; they are driven by `lurker kb sweep` (@lurker/cli).

Explicit exclusions, per the EXC registry (01-requirements.md, section "EXC registry"): no failure clustering (no mechanism exists for it) and no vector-store dependency.

## 8 Redaction and sensitive data

Current honest state: prompts, tool results, and provider-raw blocks are persisted in the journal and TranscriptStore and flow into the event stream, SSE, and OTel consumers; the only redaction hook that exists today is the VCR `redact` option (section 5.2).

Planned closure, tracked as an open question with its owner milestone in 14-open-questions.md (redaction defaults):

- an L0 serialization hook applying redact/encrypt at the append and put boundaries, symmetric on load/get, so that stored bytes and emitted bytes pass through one policy point;
- a default policy that at minimum masks strings that look like API keys and other credentials;
- a documented statement of exactly what reaches OTel attributes (the conservative default is already normative in section 3: no prompt/completion/tool content).

Until the hook lands, embedders MUST treat the event stream and SSE endpoints as exactly as sensitive as the journal itself, and shells MUST NOT widen exposure beyond the documented OTel attribute policy.
