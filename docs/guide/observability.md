---
title: Observability
description: One typed WorkflowEvent stream feeds host subscriptions, cost reports, metrics, and the OpenTelemetry exporter, with replay re-emission and default-on secret masking built in.
---

# Observability

Rulvar has exactly one observability surface: a discriminated stream of typed `WorkflowEvent` values. Everything else on this page is a consumer of that stream: `RunHandle.events` and `on()` for host code, the two terminal progress renderers in the umbrella package (`renderProgress` lines and the live `progress` tree), the `@rulvar/cli` TUI, and the OpenTelemetry exporter. There is no pluggable event-sink seam to configure; you subscribe on the handle and fold what you need.

Events are pure telemetry. No event, field, or ordering of events participates in journal identity: you can drop every event and no run outcome changes. That separation is what lets the engine mask secrets in telemetry, re-emit history on resume, and evolve the catalog without ever perturbing replay.

## The event envelope

Every event shares one envelope and adds a `type`-discriminated body:

```ts
type WorkflowEvent = {
  runId: string;
  seq: number;           // per-run telemetry counter, strictly increasing
  ts: string;            // ISO 8601 wall clock; telemetry only, never identity
  spanId: string;
  parentSpanId?: string;
  replayed?: boolean;    // true only on re-emitted journal-backed events
} & WorkflowEventBody;   // CoreEvents | AgentEvents | ToolEvents | AdaptiveEvents
```

Three envelope rules matter in practice:

- `seq` is an independent telemetry counter. It is distinct from the journal's own `seq` and the two must never be compared or joined. Where an event references a journal entry it carries an explicit `entryRef` field holding the journal seq, so you can correlate telemetry with [journal](/guide/journal) entries without guessing. `seq` is strictly increasing across the WHOLE run, resume segments included, but not contiguous: each execution segment starts at a durable per-segment base (recorded in `RunMeta.segments`), so a resumed segment's first event jumps far above the previous segment's last. Treat `seq` as ordered, never as dense, and never parse segment structure out of it.
- `ts` is wall clock and may differ between the live and replayed emission of the same logical event.
- `spanId` values are engine-minted opaque strings, unique per run (across resume segments too; span counters share the same durable per-segment base as `seq`), and are excluded from content keys.

Event names follow one convention: `domain:verb`, all lowercase ASCII (`agent:end`, `spawn:admitted`, `budget:update`). The catalog is closed per minor release; new event types only arrive with a release note. Emitters may add fields, so consumers must tolerate unknown fields and unknown event types.

## Span hierarchy

Spans form a tree per run with a fixed hierarchy:

```mermaid
flowchart LR
    R[run] --> P[phase]
    P --> A[agent]
    A --> T[tool]
    A --> C[child workflow]
    C --> R2[child subtree]
```

The run has a single root span; each `ctx.phase` opens a child span (phases nest); each agent invocation opens a child of the innermost phase span (orchestrator wake turns are agent spans); each tool call opens a child of its agent span; and each child workflow becomes the root of its own subtree under the spawning span. This tree maps one to one onto OpenTelemetry spans via `toOtel` below.

## The event catalog

All four family unions are exported from `@rulvar/core` as `CoreEvents`, `AgentEvents`, `ToolEvents`, and `AdaptiveEvents`, combined as `WorkflowEventBody`.

### Run lifecycle and core telemetry

| Event | Fires when | Notable fields |
|---|---|---|
| `run:start` | The run begins (`resumed: true` on resume). | `workflow`, `resumed` |
| `run:end` | The run settles. | `status`, `totalUsd`, `usageApprox?`, `completion?`, `childStatusCounts?`, `degradedReasons?`, `salvagedPartialChildren?`, `salvagedTerminalOutputChildren?`, `acceptanceChildren?`, `settled?` |
| `phase:start` | A `ctx.phase` block opens. | `phase` |
| `log` | The workflow or engine logs a line. | `level`, `msg`, `data?` |
| `budget:update` | Spend or committed reserves changed. | `spentUsd`, `remainingUsd`, `committedReserveUsd` |
| `external:waiting` | The run suspended on `ctx.awaitExternal`. | `key`, `entryRef`, `prompt?`, `deadlineAt?` |
| `approval:pending` | A tool call is suspended awaiting approval. | `toolName`, `entryRef`, `deadlineAt?` |
| `child:start` / `child:end` | A child workflow starts and settles. | `workflow`, `scope`, `status` on end |

Transport status and semantic completeness are different claims, and `run:end` carries both: `status` says whether the run RAN (`'ok'` includes an accepted degraded run), while `completion` (`'complete' | 'partial' | 'rejected'`) and `childStatusCounts` say whether the work is COMPLETE. They surface through the completion envelope contract: a workflow that returns an object result carrying a valid `completion` literal (and optionally a `childStatusCounts` record), or throws a typed error whose `data` carries them, gets both lifted onto `run:end`; the [orchestrator acceptance policy](/guide/orchestration-modes#acceptance-the-child-completion-policy) emits this envelope on every path, including the typed rejection. Malformed shapes stay silently absent (the event is telemetry, never authority), replay recomputes the same values from the re-executed workflow, and the OTel exporter maps them to `rulvar.run.completion` and `rulvar.run.childStatusCounts`. The same lift is mirrored onto the `RunOutcome` that `handle.result` resolves with (`outcome.completion`, `outcome.childStatusCounts`): the engine computes it once and spreads the same object onto both surfaces, so telemetry and the settled outcome can never disagree, and a host that only holds the outcome reads completeness without re-deriving it from workflow-specific shapes. Gate deployments and downstream automation on the (`status`, `completion`) PAIR, never on `status` alone: `status: 'ok'` with `completion: 'partial'` is an accepted degraded run (salvaged children, waived evidence floors), and treating it as a full success is exactly how the twelfth comparison experiment's salvaged below-floor children passed unnoticed. Since RV806 the lift also carries `acceptanceChildren`, the per-child machine roster of the acceptance fold: each spawned child with its settled status, the salvage arm that accepted it (`'partial'` or `'terminal-output'`), and, where the child declared an evidence contract, the evidence verdict (`recordedEntries`, `minEntries`, `met`, with `waivedBySalvage: true` marking a below-floor child a salvage arm accepted anyway), so "how many entries did the salvaged children actually record" is a field read, not a transcript dig; `rulvar inspect` prints the same roster from the journaled acceptance decision.

Since v1.79 the same lift carries the degradation facts the acceptance envelope has always emitted beside them: `degradedReasons` (per-child notes such as `child X settled 'limit' after the finalization reserve summary`) and the salvage lists `salvagedPartialChildren` and `salvagedTerminalOutputChildren`, validated as string arrays under the same posture (an empty array is the workflow's claim of zero degradation, absence means no claim, malformed shapes drop silently) and mapped by the OTel exporter to `rulvar.run.degradedReasons` and the matching salvage attributes. The fifth experiment's error outcome carried these facts only inside `error.data`, so the harness serialized empty top level arrays while the truth sat one level deeper; the mirror ends that dig on both the accepted and the rejected path.

One more claim rides the terminal event since RV907: `settled`. It is present, and always `false`, ONLY when a settlement write failed (the `run_settle` journal append or the terminal `RunMeta` projection, see [durability](/guide/durability#auditing-and-reconciling-the-meta-projection)): the `status` on the event is true as computation, but nothing durable records it, and `handle.result` rejects with the typed `SettlementError` instead of resolving. An event-only consumer must treat such a terminal as NOT green, whatever the status literal says: the CLI progress line appends `settled=false (outcome withheld; resume re-settles)`, and the OTel exporter stamps `rulvar.run.settled: false` and refuses the OK span status. The warn log (`settlement write failed`) precedes the event, and the throw follows it, so the stream stays ordered warn, then the marked terminal, then the rejection. Resuming the run over a healed store re-settles by replay with zero paid calls, and that settled terminal carries no `settled` field, byte for byte like every ordinary run.

### Agent lifecycle

| Event | Fires when | Notable fields |
|---|---|---|
| `agent:queued` | A spawn is admitted and waiting on the scheduler. | `agentType`, `label?` |
| `agent:start` | The logical agent dispatch begins; exactly one per span. | `model`, `role` |
| `agent:phase:start` | One model invocation phase activates inside the span (`loop`, `summarize`, `finalize`, `extract`). | `role`, `model`, `invocation` |
| `agent:phase:end` | That activation settles, with its own slice of the money. | `role`, `model`, `invocation`, `durationMs`, `usage`, `costUsd`, `costBasis?`, `outcome`, `retries?` |
| `agent:end` | The agent settles; the one event that carries the whole total. | `status`, `usage`, `costUsd`, `costBasis?`, `entryRef`, `usageApprox?`, `retryCount?`, `exploration?` |
| `agent:error` | A live attempt failed. | `error` (a wire error), `willRetry` |
| `agent:schema-retry` | Structured output failed validation and is being retried. | `attempt`, `maxAttempts` |
| `agent:stream` | A token delta arrived; only for calls that opt into streaming. | `delta` |

`agent:stream` deltas are never journaled and never re-emitted on replay. Note the asymmetry with errors: `agent:error` reports a live attempt failing right now, while a memoized error outcome coming back from the journal surfaces as a replayed `agent:end` with status `'error'`.

#### The invocation model

One agent dispatch emits exactly ONE `agent:start`/`agent:end` pair on its span, and every model invocation phase inside it (the tool loop itself, each mid-loop compaction, the finalize synthesis, the separate extract) emits its own paired `agent:phase:start`/`agent:phase:end`, keyed by `(spanId, invocation)` with a 1-based activation ordinal. That makes durations, per-phase usage, and attempts derivable without heuristics: pair the events, subtract the timestamps, sum the phases. Before this contract every phase emitted an extra unpaired `agent:start`, so a consumer pairing starts with the single end read the LAST phase's duration as the agent's and a starts-minus-ends gauge leaked one running agent per phase.

The per-phase `usage` is the delta the activation added to its `(role, model)` slice, so the phase pairs sum exactly to `agent:end`'s totals and to the journaled `usageByModel` split the [CostReport](#costreport) folds. Since RV702 `costUsd` is folded per provider request, exactly like the settled CostReport and invoice (RV504): each recorded call is priced individually and the phase carries the delta of that per-call accumulator, so a nonlinear long-context tier fires per REQUEST in the live stream too, never on a phase aggregate no single request produced (the eleventh comparison experiment measured a 60.2% raw overcount from exactly that inflation). Every money-bearing event says which fold produced its number: `costBasis: 'per-call'` is the settled fold's own basis; `'aggregate-estimate'` appears only where per-request records cannot cover the number (a checkpoint written before the reconciliation ledger shipped restores usage without call records, and the invocation total then keeps the aggregate-priced figure, labeled, rather than silently dropping restored spend), and an absent field on a stream recorded before RV702 means the aggregate basis. `retries` on a phase pair and `retryCount` on `agent:end` count transport retries; both are live telemetry only, never journaled, so replayed events omit them and absence means "zero or unknown". A summarize that fires three times gets three pairs, interleaved inside the still-open loop phase (phases are activations, not strictly nested spans; the `invocation` ordinal disambiguates).

`reduceInvocationTable(events)` (exported from `@rulvar/core`) is the official reducer over this vocabulary: it builds the per-agent, per-phase table (durations, usage, cost, retries, open flags for truncated streams) plus a per-role aggregate that matches `CostReport.byRole` without any pairing heuristics. Every row and every `byRole` bucket carries `costBasis` (RV702): a bucket stays `'per-call'` only while every folded pair carried the per-call basis, one aggregate-estimate pair degrades it, and an event without the field reduces to `'aggregate-estimate'`, never to a per-call claim the stream cannot back. A live stream and its replay reduce to identical usage and cost columns: replayed phase pairs are reconstructed from the terminal entry's recorded slices, each pair carrying its `(role, model)` share of the same per-request billing fold the invoice runs (`durationMs` 0).

`reduceCriticalPath(events)` folds the same vocabulary into the run's critical-path summary: run wall, the post-fan-in interval (the last settled non-coordination agent to `run:end`), the summed wall of `synthesize` spans, and the corresponding shares, so the improvement plan's gate (post-fan-in synthesis at most 40% of wall time) is one field read instead of hand-rolled timestamp arithmetic, and the [benchmark kit](/guide/evals#the-benchmark-kit) can expose any of these as a metric extractor. Wall numbers are live fidelity: a replayed stream re-stamps emission times, so its intervals are degenerate, exactly like phase durations; absent pieces (no `run:end` yet, no worker spans) stay `undefined` instead of guessed at.

Whenever the post-fan-in interval exists, `postFanIn` decomposes it (RV710) from the same events, no new types: the eleventh comparison experiment measured 45.5% of wall sitting after fan-in with a zero synthesis share and nothing to name it. `coordinationModelMs` is the model activations of coordination spans (the draft and repair thinking) clipped to the window; `coordinationToolMsByName` is their tool executions by name, so child-result pagination shows up under `get_child_result`/`get_child_artifact`, the finish exchanges (host validators run inside the finish tool's measured window) under `finish`, and the park-to-wake tail of an awaiting coordinator under its await tool; `synthesisMs` is the `synthesize` span wall clipped the same way; `coveredMs` is the exact interval union (buckets are clipped sums, so a clock-skew overlap can double-count a bucket but never shrink the residue); `residueMs`/`residueShare` is what no recorded interval covers: scheduling gaps, journal writes, wake latency. The residue is fixed-size overhead while the covered buckets scale with work, so on real runs the decomposition accounts for the window to within a few percent, and the optimization target is assigned AFTER these numbers exist, not before (doctrine 10).

Token accounting semantics, so the numbers read correctly: `cacheReadTokens` and `cacheWriteTokens` are SUBSETS of `inputTokens` (the Usage invariant; pricing bills uncached input as `inputTokens` minus both cache counts, each cache class at its own rate), and `reasoningTokens`, when present, is a subset of `outputTokens` (the adapters normalize it from the provider's output-token details) that is informational only: `outputTokens` is priced whole and reasoning is never billed on top.

### Tool lifecycle

| Event | Fires when | Notable fields |
|---|---|---|
| `tool:start` | A tool call dispatches. | `toolName`, `risk?` |
| `tool:end` | The tool call settles. | `outcome` (`'ok'`, `'error'`, `'denied'`), `durationMs`, plus the permission audit fields `verdict?`, `decidedBy?`, `rule?`, `advisory?`, and `guard?` when an exploration guard denied the call |

The audit fields on `tool:end` record which layer of the permission chain decided and which rule matched; see [Tools](/guide/tools). A `tool:end` carrying `guard: 'repeated-signature'` was denied by the [exploration guards](/guide/agents#exploration-guards), not the permission chain, and was never dispatched. The `exploration` summary on `agent:end` carries the guard counters (`toolCallsUsed`, `distinctSignatures`, `repeatedCalls`, `duplicateResultCalls`, `deniedRepeats`, `byTool`): present live whenever any exploration limit was configured, and on replay only when the guard abort journaled it. The OTel exporter maps the summary to `rulvar.exploration.*` span attributes and the guard marker to `rulvar.tool.guard`.

### Determinism detection

| Event | Fires when | Notable fields |
|---|---|---|
| `determinism:warning` | A bare `Date.now()` or `Math.random()` call was observed inside the run, classified workflow-origin or allowlisted. | `category` (`'bare-date-now'`, `'bare-math-random'`), `provenance` (`'workflow'`, `'allowlisted'`), `frame`, `file?`, `line?`, `column?` |

Emitted live, at most once per `(category, provenance)` per execution segment, and never journaled; because replay re-executes the body, a violation still in the code fires again on every replay, so the event appears in replayed streams organically (without the `replayed` flag). Installed dependencies and Node runtime frames are classified exempt and emit nothing. Under `determinism.mode: 'error'` a workflow-origin call additionally rejects the run with a typed `DeterminismError`; see [Runtime detection and enforcement](/guide/determinism#runtime-detection-and-enforcement).

### Adaptive orchestration, plan, and accounting events

These fire only in runs where the corresponding machinery is active (see [Adaptive orchestration](/guide/adaptive-orchestration) and [Orchestration modes](/guide/orchestration-modes)):

| Event | Fires when |
|---|---|
| `plan:revised` | A plan revision applied; carries `planHash`, applied and dropped operation counts, and `revisionUnitsRemaining`. |
| `node:parked` / `node:cancelled` | A plan node was parked or cancelled. |
| `node:linked` | A re-added task was linked to a completed donor subtree; `reclaimedUsd` is the spend recovered by reuse. |
| `orchestrator:woke` | An orchestrator wake turn started; `renderSize` is the rendered digest size. |
| `orchestrator:budget` | The orchestrator sub-account moved. Each wake digest emits `atCap` plus the digest's budget block (`runSpentUsd`, `runCeilingUsd`, `orchestratorSpentUsd`, `orchestratorCapUsd`, `finalizeReserveUsd`, `orchestratorShare`, `softWarning`); the at-cap freeze emits `atCap: true` with `spentUsd`, `capUsd`, and `finalizeReserveUsd`. |
| `escalation:raised` / `escalation:decided` | A worker escalated and the decision landed (`retry`, `decompose`, `cancel`, or `accept`). |
| `spawn:admitted` | Admission admitted a spawn, on EVERY admission boundary: the orchestrator spawn tools, PlanRunner's journal-embedded admissions (decomposition, ladder respawns, reuse and graft links), `ctx.workflow` children, and `ctx.agent` lineage admissions (declared `lineage`/`approach`). Carries the journaled decision `entryRef`, the admitting `verdict` arm, `agentType`, `logicalTaskId`, and `spawnUnitsAfter` (absent on `ctx.agent` lineage admissions, whose spawn-unit debit rides the dispatch itself). A journal-recovered decision re-announces with `replayed: true`; a cleanly replayed dispatch does not re-announce at all. |
| `spawn:rejected` | Admission rejected a spawn, on the same boundaries as `spawn:admitted`; carries the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent for pre-admission config gates such as `orchestrate` `maxSpawns`, which reject before anything is journaled). A recovered rejection re-issues with `replayed: true` when it takes effect. The caller still sees the typed `AdmissionRejectedError`. |
| `verify:failed` | A verification gate (mechanical, judge, or spot-check) failed a rung attempt. |
| `ledger:op` | A run-ledger write (brief, fact, lesson, observation). |
| `stall:detected` | A logical task's no-progress streak advanced. |
| `guard:oscillation` | The oscillation guard tripped on a repeated spawn key. |
| `resolution:applied` / `resolution:superseded` | A live resolution attempt won the first-closing-wins fold (`targetRef`, the appended attempt's `entryRef`, `by`), or lost to an earlier close (`supersededBy`, `reason`). Emitted for live attempts only; folds of prior entries at resume re-emit nothing. |
| `termination:debit` / `termination:denied` | A termination counter was debited, or a request was refused because a counter ran out. |
| `termination:config-drift` | A resumed run's live limits differ from the frozen ones. |
| `journal:compat` | Declared in the event union but not yet emitted: loading a journal outside the engine's hash-version window throws `JournalCompatibilityError` instead; see [Journal compatibility](/guide/journal-compatibility). |

## Subscribing from the host

`engine.run` returns a `RunHandle` immediately. The two subscription forms differ in where their stream begins:

- `handle.events` is **gapless from handle creation**: the engine buffers every event from the moment the handle exists, so a consumer that starts iterating late (even after `await result`) still receives the complete stream, in `seq` order. Draining a large backlog is linear in its size.
- `handle.on(type, cb)` observes **from registration onward**: events emitted before the callback was registered are not re-delivered. Register before awaiting `result` if you need the early events on this form.

The gapless buffer is also the memory contract: the engine holds the run's undelivered events as long as the handle is reachable and the stream has not been consumed. Consume `handle.events` (or drop every reference to the handle) to release them; a host that keeps thousands of settled handles alive without reading their streams keeps every buffered event alive too. For a server shell that stays up, use the HTTP server instead of retaining raw handles: its [`maxBufferedEventsPerRun` replay window is finite by default since v1.94.0, and the memory retention options](/guide/cli#the-http-server) release the rest.

```ts
// engine and the panel workflow as in the quickstart.
const handle = engine.run(panel, { question: 'Monorepo or polyrepo?' }, { budgetUsd: 2 });

// Callback form: one event type, fully typed payload, returns an unsubscribe.
const off = handle.on('agent:end', (e) => {
  console.log(`${e.agentType} settled ${e.status}: $${e.costUsd.toFixed(4)} (journal seq ${e.entryRef})`);
});

// Iterator form: the whole stream, discriminated on `type`.
for await (const event of handle.events) {
  if (event.type === 'budget:update') {
    console.log(`spent $${event.spentUsd}, reserved $${event.committedReserveUsd}`);
  }
  if (event.type === 'run:end') {
    console.log(`run settled ${event.status} at $${event.totalUsd}`);
  }
}

off();
const outcome = await handle.result;
```

Both forms are cheap to stack: a progress bar on `agent:start` and `agent:end`, a spend ticker on `budget:update`, an alert on `run:end` settling with a status other than `'ok'`. In tests, prefer the matchers from `@rulvar/testing`, which fold the same stream; see [Testing](/guide/testing).

### Throwing listeners

Listener code is best-effort telemetry, and a listener that throws can never affect the run:

- The exception is caught inside the bus; the run's outcome, its journal, and its spend are untouched.
- Delivery order is preserved: the event whose listener threw reaches every remaining listener and every iterator FIRST, and only then a single `log` event at level `warn` announces the isolation, so no observer ever sees the warning reordered ahead of its cause and `seq` stays ascending on every surface.
- The warning goes through the ordinary emission path, so its message is masked exactly like every other event (a key-shaped fragment of the listener's own error message never reaches observers raw; `maskEvents: false` opts the warning out together with everything else).
- The warning fires at most once per run segment: a listener that throws on every event, or several listeners throwing at once, cannot flood the stream or recurse.

The `EventBus listener failure ordering and masking` tests in `@rulvar/core` pin each of these guarantees.

## The live terminal progress view

The umbrella package ships two ready-made stream consumers. `renderProgress(handle.events)` is the minimal one: a plain line per lifecycle fact, readable in any pipe. `progress(...)` is the rich one: a live tree on stderr with one row per agent showing a status glyph, a running timer, token counts, and USD, plus per-role sub-timings when one call spans several invocation phases (loop, then summarize, finalize, or extract), the run header with spend against the ceiling from `budget:update`, and a final summary that includes the per-role dollar split from `RunOutcome.cost.byRole`.

```ts
import { createEngine, progress } from "@rulvar/rulvar";

const handle = engine.run(panel, { question: "Monorepo or polyrepo?" }, { budgetUsd: 2 });
const view = progress(handle);
const outcome = await handle.result;
await view.done;
```

While the run executes the terminal shows, repainted in place:

```text
/  panel  run r_8f3k2  1m 04s  $0.431 / $2.00  ###.........
  [gather]
  *  scout (web)  openai:gpt-5.6-terra  31s  in 18k out 2.1k  $0.086
  -  scout (docs)  openai:gpt-5.6-terra  47s  ~3.1k out  tool: web_fetch
  -  writer  openai:gpt-5.6-sol  > finalize  1m 02s
       roles: loop 48s · finalize 14s..
```

`progress` accepts a `RunHandle` (it subscribes through `on()`, so `handle.events` stays free for your own consumer, and the final frame is enriched from the settled `CostReport`; the `orchestrate` and `orchestratePlanned` helpers return exactly such a handle, so `progress(orchestrate(engine, goal, opts, { budgetUsd: 10 }))` composes directly), a promise resolving to a handle (for wrappers that construct one asynchronously), or a raw `WorkflowEvent` iterable, which is the gapless path for resumes: `progress(resumed.events)` sees the replayed prefix a late `on()` could miss, at the price of consuming that one-shot iterable.

Modes and honesty: on a TTY the view repaints at a bounded rate (`fps`, default 10); in pipes and CI it degrades to append-only lines, one per fact, with budget lines throttled; `mode: 'off'` disables it entirely. Exact token counts arrive only with the settle events (`agent:phase:end`, `agent:end`), so running rows show elapsed time and a tilde-marked estimate from `agent:stream` deltas; replayed rows render with a `replay` tag and never spin. The sink and clock are injectable (`sink`, `clock`) for deterministic tests, output defaults to stderr so application stdout stays clean, and colors honor `NO_COLOR` plus an explicit `color` option.

## Replay re-emission and the replayed flag

On resume, the engine re-emits events for the journal-backed facts it consumes, so a UI can rebuild the run picture without parsing the journal itself. Every re-emission carries `replayed: true` so consumers can deduplicate. The rule: exactly the journal-backed agent, tool, child, and suspension lifecycle events re-emit; everything else never carries the flag.

| Event types | Re-emitted with `replayed: true` |
|---|---|
| `agent:start`, `agent:end`, `child:start`, `child:end` for entries consumed by replay; `agent:phase:start`, `agent:phase:end` reconstructed one pair per recorded `(role, model)` usage slice (`durationMs` 0, no `retries`); `tool:start`, `tool:end` for tool results reconstructed from a replayed turn; `external:waiting`, `approval:pending` for suspensions still open | yes |
| `agent:stream` | never |
| `spawn:admitted`, `spawn:rejected` for journal-recovered admission decisions taking effect on this resume | yes |
| the remaining adaptive events (`plan:revised` through `termination:config-drift`) | no; the orchestration machinery emits them through its live path without the flag, so an adaptive event observed during a resume looks live even when it restates a journal-backed fact |
| `run:start`, `run:end`, `phase:start`, `log`, `budget:update`, `agent:queued`, `agent:error`, `agent:schema-retry` | no; they describe the current process, and `phase:start` and `log` fire live again as workflow bodies re-execute |

Replayed events carry payloads read from the journaled facts, byte for byte (status, usage, cost, verdicts), never from re-evaluation. This is the observable face of the decision-entry principle: what you see on resume is what was decided, not a recomputation.

## RunHandle: live and finished runs

```ts
interface RunHandle<R> {
  runId: string;
  result: Promise<RunOutcome<R>>;
  events: AsyncIterable<WorkflowEvent>;
  on<T extends WorkflowEvent['type']>(
    type: T,
    cb: (e: Extract<WorkflowEvent, { type: T }>) => void,
  ): () => void;                                     // returns unsubscribe
  resolveExternal(key: string, value: Json): Promise<ResolutionOutcome>;
  cancel(reason?: string): Promise<void>;
}
```

- `cancel` requests cooperative cancellation; the run settles `'cancelled'` with a complete `CostReport`.
- `resolveExternal` closes an open external suspension; repeated resolution is defined behavior (first close wins), not an error. See [Durability](/guide/durability).
- `engine.resume` returns a `ResumeHandle`, which adds `preview: Promise<ResumePreview>` with the replay hit, miss, and rerun accounting.

For a finished run you have three inspection paths. Resume it with `{ dryRun: true }` and consume the re-emitted stream: replay-strict matching guarantees zero live calls. Fold its journal directly with `costReportFromJournal`, the same pure fold the kernel's ledger uses:

```ts
import { costReportFromJournal, priceUsdOf, type Pricing } from '@rulvar/core';

const prices: Record<string, Pricing> = { /* your price table */ };

const entries = await engine.stores.journal.load('quickstart-panel-1');
const report = costReportFromJournal(entries, (servedBy, usage) => {
  const pricing = prices[servedBy];
  return pricing ? priceUsdOf(pricing, usage) : undefined; // undefined lands in unpriced
});
```

The callback's `servedBy` is a model ref string, the same `'adapterId:model'` key `byModel` reports under. The per agentType and per role breakdowns are folded from each terminal entry's `costAttribution` facts, not from a nested `servedBy.model` or a top level `agentType`; a call whose phases spanned several models splits its usage through `usageByModel` so each slice prices at the model that served it.

Or use the terminal: `rulvar runs ls --store .rulvar/journal` and `rulvar inspect <runId> --store .rulvar/journal` from `@rulvar/cli` render the same facts. Point `--store` at the directory your `JsonlFileStore` writes (`.rulvar/journal` in the quickstart's engine assembly; the CLI's own default is `.rulvar`); see [CLI](/guide/cli).

## CostReport

Every settled run carries a full cost report in `outcome.cost`, and `run:end` carries the same `totalUsd`, by construction: the event spreads the settled report's own figure (RV801), so the two cannot disagree under any pricing table. The kernel ledger behind the event folds dollars on the same settled billing basis: per provider call where an entry's dispatch records cover its usage, so a nonlinear long-context tier fires per request there exactly as it does in the report and the invoice, never on a phase aggregate no single request produced:

```ts
interface CostReport {
  totalUsd: number;                     // the NET ledger: abandoned subtrees contribute zero
  grossUsd: number;                     // totalUsd + abandoned.usd: what the provider actually billed
  abandoned: {
    usd: number;                        // priced spend under abandoned subtrees
    unpriced: Array<{ model: string; usage: Usage }>;
    usageApprox?: boolean;
  };
  byModel: Record<string, number>;      // canonical 'adapterId:model' refs
  byPhase: Record<string, number>;      // ctx.phase names
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;
  orchestrator: {
    spentUsd: number;        // orchestrator sub-account spend
    share: number;           // spentUsd / max(totalUsd, 0.01)
    wakes: number;
    forcedFinish: boolean;   // true when the at-cap freeze forced finish
    reserveUsedUsd: number;  // spend drawn from the finalize reserve
  };
  unpriced: Array<{ model: string; usage: Usage }>;
  usageApprox?: boolean;     // present and true when the total includes estimated usage
}
```

Five details worth knowing:

- `totalUsd` is an estimate computed from the usage the provider reported and the configured price table, not the provider's invoice: registry prices can lag provider price changes, and rounding or billing rules on the provider side are not modeled. Reconcile against the provider's billing when exactness matters, and reconcile against `grossUsd`, never `totalUsd`. For OpenAI runs that reconciliation is a shipped machine, not a manual join: [`reconcileStatement`](/guide/providers#openai-statement-reconciliation) takes the invoice and a normalized export (per-request rows by response id, or per-model per-component category totals; headline aggregates refused typed) and reports coverage, per-component deltas, and the implied actual rate of every component, so a divergence names the rate-card line that moved.
- `totalUsd` is the NET ledger: spend under subtrees the orchestrator abandoned contributes zero to it and to every breakdown, because it paid for branches the run discarded. The provider billed those attempts all the same, so the gross side is first class: `abandoned.usd` is exactly the excluded share and `grossUsd = totalUsd + abandoned.usd` is the immutable provider-spend figure. Abandoning a branch never shrinks `grossUsd`. `abandoned.unpriced` surfaces abandoned slices with no price row (the top-level `unpriced` lists only net slices), and `abandoned.usageApprox` follows the top-level flag's semantics over the abandoned entries.
- `usageApprox` is present and true when any usage folded into the total was estimated rather than reported by the provider (a transport cut, a stream a ceiling severed, or an abort), making the total a lower bound. The same flag rides `agent:end` and `run:end`, and the CLI cost line marks it.
- Usage on a model absent from the price table lands in `unpriced` and never contributes a silent zero to a priced bucket. Missing pricing is visible, not invisible.
- The `orchestrator` block exists in every run; without a dynamic orchestrator it is all zero with `forcedFinish: false`. The `share` denominator is floored at one cent, so a zero-cost run reports share 0 instead of dividing by zero. `byPhase` is why `ctx.phase` is structural for cost attribution while staying cosmetic for journal identity: renaming a phase changes your report, never your replay.

The budget machinery behind these numbers, including the `'exhausted'` outcome and committed reserves, is covered in [Budgets](/guide/budgets).

## The invoice export

Reconciling a run against the provider's bill needs more than totals: it needs the individual wire calls. Every live provider dispatch, successful or not, mints a `ProviderCallRecord` on the terminal entry's `providerCalls` ledger:

```ts
interface ProviderCallRecord {
  ordinal: number;                      // 1-based dispatch order across the invocation
  role: InvocationRole;                 // the phase that paid the call
  servedBy: ModelRef;
  attempt: number;                      // 1-based try on the serving target; retries increment it
  outcome: 'ok' | 'error' | 'aborted';
  responseId?: string;                  // the provider's response id, when surfaced
  usage: Usage;                         // this call's usage exactly
  usageApprox?: boolean;
  errorCode?: string;                   // WireError.code on 'error' outcomes
  aborted?: 'budget' | 'external' | 'idle';
}
```

Both shipped adapters surface the provider's response id on every finish, and the ledger persists it. Records are minted from the same sanitized usage the phase slices accumulate, so per-model sums over an entry's records reconcile with `usageByModel` by construction; failed and retried attempts keep their billed usage attributable instead of dissolving into the aggregate. Quota denials and abort short circuits that never reached the adapter mint nothing: the ledger enumerates exactly the calls a provider could bill. The ledger rides every checkpoint boundary (a kill-and-resume keeps pre-kill calls attributable, ordinals continuing) and restores verbatim on replay.

`invoiceFromJournal(entries, priceUsd)` folds the ledger into the machine-readable export: one `InvoiceRow` per billable call, each with a reconciliation verdict that names exactly what it asserts. `provider-id-present` means the adapter surfaced the provider's response id for the call, the join key for lining the row up against a provider statement; it deliberately claims no statement or amount match, because the library never sees provider billing data (those deeper reconciliation tiers are host-side joins keyed on `responseId`). `missing-provider-id` marks a finished call without one; `unconfirmed` marks a failed or severed call without one (the provider may or may not have billed it, and there is no id to match); `unattributed` marks spend with no per-call record (entries journaled before the ledger shipped, fully replayed invocations, and the remainder when restored pre-ledger usage exceeds the recorded calls). Nothing is dropped: unattributed spend becomes visible rows, and `reconciliationFailures` counts every row that is not `provider-id-present`. An `unconfirmed` row whose every usage counter is zero additionally carries `usageUnknown: true` (and the export counts them in `usageUnknownRows`): the zeros mean "nothing recorded", never "the provider metered nothing", because a failed attempt may have billed prompt processing before it died, so a statement join must treat that row's usage as unknown rather than as a zero claim. The CLI text form marks such rows `usage-unknown`. The totals are the same billing fold the CostReport runs, so `totalUsd === CostReport.grossUsd` and `netUsd === CostReport.totalUsd` exactly. Since RV504 that fold prices a fully attributed entry per provider call: a nonlinear long-context tier fires per REQUEST (the pricing contract's own semantics), never on an aggregate no single request produced, so on runs whose records fully cover their usage the settled total agrees with the live budget's per-dispatch debits. Coverage is decided per model with a symmetric key (RV604): both sides of the comparison aggregate by serving model, so the per-role usage split of one model (a schema fires a same-model extract by default, so several slices of one model are the ordinary shape) no longer refuses coverage, and a partially recorded entry prices each covered model per call while an uncovered model honestly keeps the aggregate basis. The export declares its basis machine-readably: `pricingBasis: 'per-call'` says each row's `usd` prices that call alone, and `rowUsdNonAdditive: false` says the rows sum to `totalUsd` (each row's `usd` then agrees with its `allocatedUsd`). It flips to `true` only when the fold had to price something on the aggregate basis, an entry with no per-call records or with records that do not cover its usage; a nonlinear table then prices a split differently from its sum, so when your rows must sum, sum `allocatedUsd`: the additive column distributes each entry-and-model pool of the same gross fold across its rows in proportion to per-row `usd`, and its flat sum reproduces `totalUsd` exactly in every case. The remainder beneath incomplete records is computed per usage slice (RV605): each slice subtracts only the records of its own serving model (and role, when the slice carries one), and the unattributed row it produces keeps that slice's model and role, so one model's spend can never surface as a row of another model just to make the column sum. Remainder rows exist only for UNCOVERED models (RV703): a covered model's rows are exactly its records, the same per-model decision the billing fold makes (the fold publishes it as `coveredModels`), so a role mismatch between a model's records and its slices (a record carrying one role, or none, against the schema-extract split) cannot fabricate a phantom remainder that would double-count tokens, break the `rowUsdNonAdditive: false` promise, and siphon allocation from the real call's row. On a journal so malformed that an allocation pool has dollars and no row to carry them, the fold refuses the transfer and declares the amount in `unallocatedUsd` instead of silently moving it; the flat `allocatedUsd` sum then reproduces `totalUsd` minus exactly that declared share. Pricing happens at fold time from the table you pass, exactly like the CostReport.

That fold-time pricing used to make history unstable: update the live price table and the same journal folded to a different invoice. When `createEngine({ pricing })` is configured, the settling segment now pins what it actually applied (RV407): the resolved pricing row of every model the journal used (table rows, and the caps-fallback rows of models the table misses), plus the table's `pricingVersion`, recorded additively inside the existing run-settle decision value, so the journal alone carries everything a reproducible fold needs. The pin is gated on the configured table deliberately: caps-fallback pricing arrives ambiently from adapters, and a setting you never enabled must not change your journals, so runs without a table (and runs with no priced model) settle byte for byte as before; rates the fold would refuse anyway, non-finite or negative, are never pinned. `journalPricingSnapshot(entries)` reads the pin back and rebuilds a `priceUsd` over exactly those rows (a model absent from the pin folds as unpriced, never a silent zero), and `invoiceFromJournal` accepts a declared provenance so the export says which rates priced it: `pricing.source` is `'composed'` when the snapshot's composition priced the fold (the shipped consumers), `'snapshot'` when a caller priced with the raw pinned rows alone, and `'current-table'` when no pin exists (journals settled before the pin shipped keep the historical behavior), with the pinned rows and version carried on pin-priced exports. The pin governs the reporting folds and the resume budget seed (RV801: the spent figure a resumed segment starts from is the settled fold, the same per-call basis and per-segment pins as `outcome.cost.totalUsd`, so a resume never re-prices settled history the run already reported); live pricing and the journaled spend debits of new work were always priced at write time and are untouched. Pins also compose across segments (RV505): every settling segment pins the union it applied, and the reader keys each pin by its settle seq, so a seq-aware fold prices every row under the pin of ITS OWN segment, the rates its live debits actually used. A run suspended under one price table and resumed under another therefore keeps its history at the original rates, in the settled outcome's cost mirror and in every later `inspect`/`invoice` fold alike, instead of silently re-pricing settled segments under the rotated table; seq-less callers keep the historical last-pin behavior, and `pinnedThroughSeq` names where the pinned history ends.

The composition itself is an exported method (RV611): `snapshot.composedPriceUsd(current)` is the exact rule the engine's outcome mirror applies at settle, and the stored consumers (`rulvar inspect`, `rulvar invoice`, and the server's stored-run cost endpoint) fold through it instead of passing the raw snapshot, so a stored fold and the settled outcome can never disagree. Under the composition, a pin-covered row prices at the rates its own settle recorded, and the tail past the last pin (a segment journaled but never settled, the crashed-mid-flight shape) prices at the caller's current table, exactly like the live debits that tail would have settled with; the raw last-pin fold used to price that tail at rates the run's own settle would never apply, silently. Two fallbacks are deliberate compromises, documented rather than hidden: a covered model its covering pin missed back-reprices at the LAST pin when that pin names it (the journal never recorded what those debits actually cost), and a model no pin resolves falls to the current table; a model neither names folds as unpriced. The snapshot also carries `segments`, every pin's seq boundaries, `pricingVersion`, and rows in journal order, and composed invoice exports declare them together with `pinnedThroughSeq` (each row's `entrySeq` locates it against the bound), so an invoice folded across a price-table rotation names every version that priced it instead of hiding the rotation behind the last one. The composition's second half names itself too (RV706): `pricing.currentPricingVersion` carries the version of the caller's CURRENT table, the one that priced everything past `pinnedThroughSeq` (on `current-table` exports, the whole fold), and the CLI text forms extend the suffix to `pins composed with the current table (v-a, v-b; current v-live)`; without a configured table version the field is absent and the pre-RV706 forms are byte for byte unchanged.

`rulvar invoice <runId>` prints the rows and totals from a stored run, priced by the run's settle pins composed with the assembled current table (the `pricing rates:` line names the rule and every pinned version); `rulvar inspect` and the server's stored-run cost endpoint fold through the same composition; `--json` emits the `InvoiceExport` object for finance tooling. When any applicable row carries `ratesVerifiedAt` (RV814), a `rates verified:` line follows, naming each priced model's verification date with its age, pinned rows first (the rates that actually priced settled history) and the current table past them; see [rate verification and drift](/guide/providers#rate-verification-and-drift). See [the CLI guide](/guide/cli).

## Metrics

Rulvar ships metric definitions and their inputs, not a metrics backend. Each metric below is a pure fold over the event stream, the journal, or `CostReport`, so any dashboard that agrees on the definitions agrees on the numbers:

| Metric | Definition | Source | What it tells you |
|---|---|---|---|
| Ledger ops per spawn | authored `ledger:op` count / `spawn:admitted` count, per run | event stream | how much shared-ledger writing your agents actually do |
| Wake render size | distribution of `orchestrator:woke` `renderSize` per run | event stream | whether the wake digest render budget is sized right |
| Escalation rate by agent type | `escalation:raised` count / spawn count, grouped by `agentType` | event stream | which agent profiles and ladders need tuning |
| Orchestrator share p50/p90 | distribution of `CostReport.orchestrator.share` across runs | CostReport | whether coordination overhead stays a small fraction of spend |
| Abandoned / reclaimed / net lost USD | fold over applied abandons and `node:linked` reclaim data; net lost = abandoned minus reclaimed | journal fold | the real cost of plan churn and oscillation |

## Exporting traces to OpenTelemetry

The OTel exporter ships in `@rulvar/cli`, not in the core: `@rulvar/core` has zero OpenTelemetry dependency, and `@opentelemetry/api` (^1.9) is an optional peer of the CLI package. `toOtel(run, tracer)` consumes a run's event stream in `seq` order and maps the span tree one to one onto OTel spans: span openers start spans, the matching closers end them with the closing status, and payload-only events (`log`, `budget:update`, the adaptive events) attach as OTel span events on their enclosing span. It resolves with the number of spans created.

```bash
pnpm add @rulvar/cli @opentelemetry/api
```

```ts
import { trace } from '@opentelemetry/api';
import { toOtel } from '@rulvar/cli';

const tracer = trace.getTracer('my-host');

// Live: hand the handle to the exporter; it drains events until settle.
const handle = engine.run(panel, args, { budgetUsd: 2 });
const spanCount = await toOtel(handle, tracer);

// After the fact: a dry-run resume re-emits the journal-backed history
// with zero live calls, and the exporter turns it into the same trace.
const finished = engine.resume('quickstart-panel-1', panel, { args, dryRun: true });
await toOtel(finished, tracer);
```

Pass `contextApi` (the `context` API from `@opentelemetry/api`) and `setSpan` (`trace.setSpan`) in the options and the exporter sets real OTel parent links: every child span starts under a context derived from its parent span, so the run > phase > agent > tool > child tree lands in the trace structure itself. Each `agent:phase` pair additionally becomes an `invocation <role>` child span of its agent span, keyed `(spanId, invocation)`, carrying `gen_ai.operation.name`, `gen_ai.request.model`, and on close the phase's `gen_ai.usage.*`, `rulvar.cost_usd`, and `rulvar.retries`; the agent span itself closes only at `agent:end`, with the whole dispatch's usage, cost, `rulvar.retry_count`, and the `rulvar.exploration.*` counters. Each tool execution becomes a `tool <name>` child span of its agent span (RV802): tool events ride the agent's `spanId` and carry no per-call id, so the exporter pairs each `tool:start` with its `tool:end` under a synthetic FIFO key per `(agent span, tool name)`; concurrent same-name calls on one agent may swap attribution among identically named spans, while counts, parentage, and durations stay exact, a denied call closes its own span with `rulvar.status: 'denied'` and the `rulvar.tool.guard` marker, and a `tool:end` with no matching start (a foreign or truncated stream) attaches as a span event instead of closing anything. Before RV802 the first `tool:end` closed the agent span itself, so `agent:end` attached its usage and cost to nothing and tool executions never became spans at all. Without the context options, spans come out flat but fully attributed: the parentage travels in the `rulvar.*` attributes below (`rulvar.run_id` groups a run's spans, and `rulvar.scope`, where present, places a span in the tree). An opener for an already-open span never duplicates it: a replayed re-emission marks the original with `rulvar.replayed = true`, and a stream from a pre-RV-207 core (where every phase emitted an extra `agent:start`) cannot overwrite the tracked agent span and leak it unended.

Attributes use two namespaces:

| Attribute | Where |
|---|---|
| `rulvar.run_id` | every span |
| `rulvar.entry_seq` | every span and span event; despite the name, the value is the emitting event's telemetry stream `seq`, not a journal entry reference, so never join it against journal entries |
| `rulvar.scope` | spans whose opening event carries a scope |
| `rulvar.agent_type` | agent spans |
| `rulvar.tool_name` | tool spans |
| `rulvar.tool.guard` | tool spans denied by an engine guard, not the permission chain |
| `rulvar.status` | set at close from the closing event's status or outcome |
| `rulvar.replayed` | spans opened by replayed events |
| `gen_ai.request.model` | agent spans |
| `gen_ai.operation.name` | agent spans (the invocation role) |
| `rulvar.determinism.category`, `rulvar.determinism.provenance`, `code.filepath`, `code.lineno` | the `determinism:warning` span event, attached to its enclosing span with the localized code location, so a backend can alert on workflow-provenance warnings without parsing frames |

The `gen_ai.*` semantic conventions are flagged unstable upstream, so the exact mapping is documented per release and may change in minor releases; OTel attribute names are outside Rulvar's compatibility surface (see [Versioning](/reference/versioning)).

::: info Content never rides spans
Prompts, completions, tool inputs, tool outputs, and provider-raw blocks are never exported as span attributes or span events. Only identifiers, statuses, usage counters, and cost figures leave the process, and every string attribute additionally passes the secret-masking policy below.
:::

`@rulvar/cli` also exports the terminal renderer behind `rulvar run`: `renderEventLine(event)` formats one event (or returns `undefined` for silent types) and `attachProgress(handle, io)` wires it to a handle's stream.

## Redaction

The default key-masking policy is on at the telemetry boundary. Every emitted `WorkflowEvent`, and therefore everything `events`, `on()`, the progress renderer, and the OTel exporter see, passes `maskSecrets`: strings that look like credentials (provider API keys, OAuth and bearer tokens, personal access tokens, AWS access keys, private-key blocks) are replaced with the `[masked-secret]` marker, exported as the `MASKED_SECRET` constant. Opt out per engine:

```ts
import { createEngine } from '@rulvar/core';
import { anthropic } from '@rulvar/anthropic';

const engine = createEngine({
  adapters: [anthropic()],
  redaction: { maskEvents: false }, // default: true
});
```

Masking applies to telemetry only and never to journaled values. Because events are excluded from identity by construction, masking cannot perturb replay. The same helpers are exported for your own sinks: `maskSecrets(text)` for one string, `maskSecretsDeep(value)` for a whole tree (it returns the input identity when nothing matched, so clean events cost no allocation), and `maskSecretsJson(value)` as the JSON-typed alias.

## Terminal safety in the renderers

Event fields can carry attacker-influenced strings: a provider or tool error message, a model id, a workflow or agent label, log text, and anything an OpenAI-compatible or injected endpoint returns. Rendered verbatim, control characters and ANSI escape sequences in those strings can clear the screen, recolor output to hide forged text, set the window title, drive the clipboard on some terminals, or inject fresh newlines that forge CI log structure. Secret masking does not address this: it targets credential shapes, not control bytes.

Both bundled renderers, the live `progress` view and the minimal `renderProgress` line printer, and the `@rulvar/cli` event line renderer pass every dynamic field through the shared `sanitizeTerminalText` sanitizer before interpolation, adding their own colors only afterward. The discipline covers text that never travelled the event stream too: an error a rejected source hands `progress()` is secret-masked FIRST (it never crossed the event masking boundary) and sanitized second before it can reach the sink, and a recognized event arriving from a raw iterable with a missing or mistyped field degrades its own row instead of stopping the view. After sanitization a value carries no C0 control, no `DEL`, no C1 byte (including every 8-bit escape-sequence introducer), and no ESC-initiated CSI/OSC/DCS sequence; control runs collapse to a single space so one event can never become two physical lines. `sanitizeTerminalText(text)` is exported from `@rulvar/core` for your own terminal sinks; apply it to every untrusted value before you print it, exactly as you would apply `maskSecrets` at the telemetry boundary.

::: warning The journal is plaintext by default
Prompts, tool results, and provider-raw blocks persist in the journal and transcript store in plaintext unless you configure the store-level serialization hook (`createEngine({ serialization })`), which applies redact or encrypt transforms symmetrically at the append and load boundaries; see [Stores](/guide/stores). The journal stays plaintext by default because replay is the product, and lossy journal redaction is a deliberate host trade, never a default. Treat the journal and raw store access as sensitive, and note that event payloads can still embed sensitive content that is not key-shaped. The store's `RunMeta` records are sensitive too: `RunMeta.argsHash` is a deterministic, unsalted SHA-256 of a run's genesis args, so it reveals args equality across runs and low-entropy args are recoverable by hashing candidate values. The serialization hook covers journal entries, not meta, so protect meta and `rulvar inspect` output (which prints the full hash) with the same access control as the journal and transcripts. For recording test fixtures, the VCR `redact` hook strips secrets at record time; see [Testing](/guide/testing).
:::

## Next steps

- [Budgets](/guide/budgets): the three-layer budget behind `budget:update` and the `exhausted` outcome.
- [Adaptive orchestration](/guide/adaptive-orchestration): the machinery that emits the plan, spawn, and escalation events.
- [Testing](/guide/testing): matchers over the settled handle, VCR cassettes, and replay-strict runs.
- [CLI](/guide/cli): `rulvar runs ls`, `rulvar inspect`, and engine assembly from config.
- [API reference](/api/@rulvar/core/): every core symbol above; the exporter surface is under [@rulvar/cli](/api/@rulvar/cli/).
