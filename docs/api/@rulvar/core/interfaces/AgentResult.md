[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentResult

# Interface: AgentResult\&lt;T\&gt;

Defined in: [packages/core/src/runtime/agent-loop.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L97)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abortclass"></a> `abortClass?` | `"no-progress"` | The dedicated first-class abort class (M3-T08): present on the engine-decided no-progress abort (status 'limit'), never on user cancellation or ordinary cap hits. | [packages/core/src/runtime/agent-loop.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L138) |
| <a id="property-artifacts"></a> `artifacts?` | [`Artifact`](/api/@rulvar/core/interfaces/Artifact.md)[] | - | [packages/core/src/runtime/agent-loop.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L117) |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/runtime/agent-loop.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L101) |
| <a id="property-error"></a> `error?` | [`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md) | - | [packages/core/src/runtime/agent-loop.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L118) |
| <a id="property-errormessage"></a> `errorMessage?` | `string` | Human-readable detail behind `error` (provider message, first schema issue): feeds the journaled WireError message. An additive field; never part of identity. | [packages/core/src/runtime/agent-loop.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L124) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | Present if and only if status === 'escalated'. | [packages/core/src/runtime/agent-loop.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L126) |
| <a id="property-escalationrequest"></a> `escalationRequest?` | [`EscalationRequest`](/api/@rulvar/core/interfaces/EscalationRequest.md) | Engine-internal: the accepted escalate request before the runtime fills costToDate and salvage into the full report. The ctx layer consumes and removes it; consumers read `escalation`. | [packages/core/src/runtime/agent-loop.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L132) |
| <a id="property-output"></a> `output` | `T` \| `null` | - | [packages/core/src/runtime/agent-loop.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L99) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | The model that actually served the loop phase at the end (M4-T04): differs from the requested spec only under transport failover. | [packages/core/src/runtime/agent-loop.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L107) |
| <a id="property-status"></a> `status` | [`AgentStatus`](/api/@rulvar/core/type-aliases/AgentStatus.md) | - | [packages/core/src/runtime/agent-loop.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L98) |
| <a id="property-transcriptref"></a> `transcriptRef` | `string` | - | [packages/core/src/runtime/agent-loop.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L116) |
| <a id="property-turns"></a> `turns` | `number` | - | [packages/core/src/runtime/agent-loop.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L102) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/runtime/agent-loop.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L100) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Present only when the call spanned MORE THAN ONE serving model (the loop, extract, finalize, and summarize roles resolve independently): usage split per model, so `costUsd` and every cost bucket price each slice at its own rate. Absent for a single-model call, which (usage, servedBy) already describes exactly. | [packages/core/src/runtime/agent-loop.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L115) |
