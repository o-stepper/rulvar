[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentResult

# Interface: AgentResult\&lt;T\&gt;

Defined in: `packages/core/dist/index.d.ts`

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abortclass"></a> `abortClass?` | [`AbortClass`](/api/@rulvar/rulvar/type-aliases/AbortClass.md) | The dedicated first-class abort class (M3-T08): present on the engine-decided no-progress abort (status 'limit'), never on user cancellation or ordinary cap hits. | `packages/core/dist/index.d.ts` |
| <a id="property-artifacts"></a> `artifacts?` | [`Artifact`](/api/@rulvar/rulvar/interfaces/Artifact.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-costbasis"></a> `costBasis` | [`CostBasis`](/api/@rulvar/rulvar/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702): 'per-call' when every usage slice (restored included) is covered by per-request records priced individually, exactly the settled fold's basis; 'aggregate-estimate' when a restored checkpoint left usage no record backs, in which case the aggregate-priced number is kept (never silently dropped) and labeled. | `packages/core/dist/index.d.ts` |
| <a id="property-costusd"></a> `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-error"></a> `error?` | [`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-errormessage"></a> `errorMessage?` | `string` | Human-readable detail behind `error` (provider message, first schema issue): feeds the journaled WireError message. An additive field; never part of identity. | `packages/core/dist/index.d.ts` |
| <a id="property-escalation"></a> `escalation?` | [`EscalationReport`](/api/@rulvar/rulvar/interfaces/EscalationReport.md) | Present if and only if status === 'escalated'. | `packages/core/dist/index.d.ts` |
| <a id="property-escalationrequest"></a> `escalationRequest?` | [`EscalationRequest`](/api/@rulvar/rulvar/interfaces/EscalationRequest.md) | Engine-internal: the accepted escalate request before the runtime fills costToDate and salvage into the full report. The ctx layer consumes and removes it; consumers read `escalation`. | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; \} | The evidence verdict under a DECLARED evidence contract (RV806): the window-derived count of successful `record_evidence` executions (the same counting rule as the enforce-refuse floor), the declared floor, and whether the count met it, stamped on EVERY terminal status so the orchestrator's acceptance summary can report each child's evidence as met, unmet, or waived by salvage. Absent without a declared contract: those results stay byte-identical. Live-window derived like `partial`: a checkpointless restore that lost the window reports what the restored window shows. | `packages/core/dist/index.d.ts` |
| `evidence.met` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `evidence.minEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| `evidence.recordedEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-evidencefloor"></a> `evidenceFloor?` | \{ `minEntries`: `number`; `recordedEntries`: `number`; \} | The evidence floor refusal detail (RV507): present ONLY when an enforced contract refused an otherwise-ok settle. The ctx layer folds it into the journaled terminal error data and memoizes the outcome (the refusal is deterministic from the paid transcript, so a rerun would only re-pay the same bounded failure). | `packages/core/dist/index.d.ts` |
| `evidenceFloor.minEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| `evidenceFloor.recordedEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-exploration"></a> `exploration?` | [`ExplorationSummary`](/api/@rulvar/rulvar/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210): present whenever any of the exploration limits (toolBudgetNotices, maxRepeatedToolSignature, maxNoNewEvidenceCalls) was configured. Journaled inside the terminal error payload (and restored on replay) only for the guard's own abort (abortClass 'exploration'); otherwise live telemetry like transportRetries. | `packages/core/dist/index.d.ts` |
| <a id="property-output"></a> `output` | `T` \| `null` | - | `packages/core/dist/index.d.ts` |
| <a id="property-partial"></a> `partial?` | [`ProgressReport`](/api/@rulvar/rulvar/interfaces/ProgressReport.md) | The structured terminal partial (RV-210 close-out): the LAST successful `report_progress` call of the invocation, present only on a 'limit' terminal (cap expiry or an engine-decided abort) whose transcript recorded at least one report. Derived deterministically from the message window: live from the loop's own history (a final boundary checkpoint is written so the window is durable), on replay from the terminal checkpoint, so both read the same bytes. This is what lets a caller salvage a limit child's collected work instead of seeing a bare 'terminal status limit'. | `packages/core/dist/index.d.ts` |
| <a id="property-providercalls"></a> `providerCalls?` | [`ProviderCallRecord`](/api/@rulvar/rulvar/interfaces/ProviderCallRecord.md)[] | The per-dispatch reconciliation ledger (P1.3): one record per live provider call this invocation made, failed and retried attempts included, each with its own usage and the provider's response id when the adapter surfaced one. Journaled on the terminal entry and restored verbatim on replay, so a live result and its replayed one read the same ledger; `invoiceFromJournal` folds the same records into the invoice export. Absent when the invocation made no wire call (a fully replayed invocation). | `packages/core/dist/index.d.ts` |
| <a id="property-quotadenials"></a> `quotaDenials?` | \{ `recovered`: `number`; `requests`: `number`; `tokens`: `number`; `total`: `number`; \} | Pre-wire quota-limiter denials, split by dimension, with the recovered count (RV1510). A denial never reached the provider and never billed; conflating it with transportRetries misread the seventeenth comparison benchmark's telemetry. Live telemetry only, exactly like transportRetries: never journaled, absent on a replayed result, absent means "zero or unknown". | `packages/core/dist/index.d.ts` |
| `quotaDenials.recovered` | `number` | - | `packages/core/dist/index.d.ts` |
| `quotaDenials.requests` | `number` | - | `packages/core/dist/index.d.ts` |
| `quotaDenials.tokens` | `number` | - | `packages/core/dist/index.d.ts` |
| `quotaDenials.total` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-ratelimitobservations"></a> `rateLimitObservations?` | [`RateLimitObservation`](/api/@rulvar/rulvar/interfaces/RateLimitObservation.md)[] | Provider-reported rate limits observed on this invocation's 429s (the v1.71 experiment review, P0.5): one entry per (provider, model), the latest observation winning, parsed by the adapters into `WireError.data.reportedLimits`. Live telemetry only, exactly like transportRetries: never journaled, absent on a replayed result; the ctx layer holds it against `quota.declaredRules` and journals the drift verdicts, which ARE durable. | `packages/core/dist/index.d.ts` |
| <a id="property-schemarecoveredterminalexchanges"></a> `schemaRecoveredTerminalExchanges?` | `number` | Terminal-tool exchanges whose near-JSON ARGUMENTS the unparsed second chance (v1.75.1) RECOVERED into a schema-valid call (the sixth comparison experiment; the judge's P1.5): the recovery used to leave only a warn log behind, invisible on the outcome. A live process counter like transportRetries (pure telemetry: nothing downstream feeds on it), so a resumed segment counts only its own recoveries; absent when zero. | `packages/core/dist/index.d.ts` |
| <a id="property-schemarejectedterminalexchanges"></a> `schemaRejectedTerminalExchanges?` | `number` | Terminal-tool exchanges whose ARGUMENTS died at the schema gate (the unparsed second chance included, when it did not recover): the v1.74 experiment lost six finish payloads to exactly this class, and nothing outside the transcript said so (host validation rejections, by contrast, journal decision entries). Derived from the message window like the repair-reserve grants, so live and resumed segments count the same total; absent when zero. | `packages/core/dist/index.d.ts` |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | The model that actually served the loop phase at the end (M4-T04): differs from the requested spec only under transport failover. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | [`AgentStatus`](/api/@rulvar/rulvar/type-aliases/AgentStatus.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-toolbudget"></a> `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/rulvar/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304): present live whenever maxToolCalls, toolUnits, or toolBudgetExtension is configured. Live telemetry only, exactly like transportRetries: never journaled, absent on a replayed result. | `packages/core/dist/index.d.ts` |
| <a id="property-transcriptref"></a> `transcriptRef` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-transportretries"></a> `transportRetries?` | `number` | Transport retries across the span's phase activations, present only when greater than zero. Live telemetry only: the ctx layer surfaces it as `agent:end` retryCount; it is never journaled, so a replayed result omits it (absent means "zero or unknown"). | `packages/core/dist/index.d.ts` |
| <a id="property-turns"></a> `turns` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/rulvar/interfaces/UsageSlice.md)[] | Present only when the call spanned MORE THAN ONE (invocation role, serving model) pair (the loop, extract, finalize, and summarize roles resolve independently): usage split per (role, model), so `costUsd` and every cost bucket price each slice at its own rate and `CostReport.byRole` attributes each phase to its own bucket (v1.19.0 review P1-2). Absent for a single-phase single-model call, which (usage, servedBy) already describes exactly. | `packages/core/dist/index.d.ts` |
