[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentResult

# Interface: AgentResult\&lt;T\&gt;

Defined in: [packages/core/src/runtime/agent-loop.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L110)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abortclass"></a> `abortClass?` | [`AbortClass`](/api/@rulvar/core/type-aliases/AbortClass.md) | The dedicated first-class abort class (M3-T08): present on the engine-decided no-progress abort (status 'limit'), never on user cancellation or ordinary cap hits. | [packages/core/src/runtime/agent-loop.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L153) |
| <a id="property-artifacts"></a> `artifacts?` | [`Artifact`](/api/@rulvar/core/interfaces/Artifact.md)[] | - | [packages/core/src/runtime/agent-loop.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L132) |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/runtime/agent-loop.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L114) |
| <a id="property-error"></a> `error?` | [`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md) | - | [packages/core/src/runtime/agent-loop.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L133) |
| <a id="property-errormessage"></a> `errorMessage?` | `string` | Human-readable detail behind `error` (provider message, first schema issue): feeds the journaled WireError message. An additive field; never part of identity. | [packages/core/src/runtime/agent-loop.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L139) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | Present if and only if status === 'escalated'. | [packages/core/src/runtime/agent-loop.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L141) |
| <a id="property-escalationrequest"></a> `escalationRequest?` | [`EscalationRequest`](/api/@rulvar/core/interfaces/EscalationRequest.md) | Engine-internal: the accepted escalate request before the runtime fills costToDate and salvage into the full report. The ctx layer consumes and removes it; consumers read `escalation`. | [packages/core/src/runtime/agent-loop.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L147) |
| <a id="property-exploration"></a> `exploration?` | [`ExplorationSummary`](/api/@rulvar/core/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210): present whenever any of the exploration limits (toolBudgetNotices, maxRepeatedToolSignature, maxNoNewEvidenceCalls) was configured. Journaled inside the terminal error payload (and restored on replay) only for the guard's own abort (abortClass 'exploration'); otherwise live telemetry like transportRetries. | [packages/core/src/runtime/agent-loop.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L169) |
| <a id="property-output"></a> `output` | `T` \| `null` | - | [packages/core/src/runtime/agent-loop.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L112) |
| <a id="property-partial"></a> `partial?` | [`ProgressReport`](/api/@rulvar/core/interfaces/ProgressReport.md) | The structured terminal partial (RV-210 close-out): the LAST successful `report_progress` call of the invocation, present only on a 'limit' terminal (cap expiry or an engine-decided abort) whose transcript recorded at least one report. Derived deterministically from the message window: live from the loop's own history (a final boundary checkpoint is written so the window is durable), on replay from the terminal checkpoint, so both read the same bytes. This is what lets a caller salvage a limit child's collected work instead of seeing a bare 'terminal status limit'. | [packages/core/src/runtime/agent-loop.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L181) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | The model that actually served the loop phase at the end (M4-T04): differs from the requested spec only under transport failover. | [packages/core/src/runtime/agent-loop.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L120) |
| <a id="property-status"></a> `status` | [`AgentStatus`](/api/@rulvar/core/type-aliases/AgentStatus.md) | - | [packages/core/src/runtime/agent-loop.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L111) |
| <a id="property-transcriptref"></a> `transcriptRef` | `string` | - | [packages/core/src/runtime/agent-loop.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L131) |
| <a id="property-transportretries"></a> `transportRetries?` | `number` | Transport retries across the span's phase activations, present only when greater than zero. Live telemetry only: the ctx layer surfaces it as `agent:end` retryCount; it is never journaled, so a replayed result omits it (absent means "zero or unknown"). | [packages/core/src/runtime/agent-loop.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L160) |
| <a id="property-turns"></a> `turns` | `number` | - | [packages/core/src/runtime/agent-loop.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L115) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/runtime/agent-loop.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L113) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Present only when the call spanned MORE THAN ONE (invocation role, serving model) pair (the loop, extract, finalize, and summarize roles resolve independently): usage split per (role, model), so `costUsd` and every cost bucket price each slice at its own rate and `CostReport.byRole` attributes each phase to its own bucket (v1.19.0 review P1-2). Absent for a single-phase single-model call, which (usage, servedBy) already describes exactly. | [packages/core/src/runtime/agent-loop.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L130) |
