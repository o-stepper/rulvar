[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentResult

# Interface: AgentResult\&lt;T\&gt;

Defined in: `packages/core/dist/index.d.ts`

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abortclass"></a> `abortClass?` | `"no-progress"` | The dedicated first-class abort class (M3-T08): present on the engine-decided no-progress abort (status 'limit'), never on user cancellation or ordinary cap hits. | `packages/core/dist/index.d.ts` |
| <a id="property-artifacts"></a> `artifacts?` | [`Artifact`](/api/@rulvar/rulvar/interfaces/Artifact.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-costusd"></a> `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-error"></a> `error?` | [`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-errormessage"></a> `errorMessage?` | `string` | Human-readable detail behind `error` (provider message, first schema issue): feeds the journaled WireError message. An additive field; never part of identity. | `packages/core/dist/index.d.ts` |
| <a id="property-escalation"></a> `escalation?` | [`EscalationReport`](/api/@rulvar/rulvar/interfaces/EscalationReport.md) | Present if and only if status === 'escalated'. | `packages/core/dist/index.d.ts` |
| <a id="property-escalationrequest"></a> `escalationRequest?` | [`EscalationRequest`](/api/@rulvar/rulvar/interfaces/EscalationRequest.md) | Engine-internal: the accepted escalate request before the runtime fills costToDate and salvage into the full report. The ctx layer consumes and removes it; consumers read `escalation`. | `packages/core/dist/index.d.ts` |
| <a id="property-output"></a> `output` | `T` \| `null` | - | `packages/core/dist/index.d.ts` |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | The model that actually served the loop phase at the end (M4-T04): differs from the requested spec only under transport failover. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | [`AgentStatus`](/api/@rulvar/rulvar/type-aliases/AgentStatus.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-transcriptref"></a> `transcriptRef` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-turns"></a> `turns` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/rulvar/interfaces/UsageSlice.md)[] | Present only when the call spanned MORE THAN ONE serving model (the loop, extract, finalize, and summarize roles resolve independently): usage split per model, so `costUsd` and every cost bucket price each slice at its own rate. Absent for a single-model call, which (usage, servedBy) already describes exactly. | `packages/core/dist/index.d.ts` |
