[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentResult

# Interface: AgentResult\&lt;T\&gt;

Defined in: [packages/core/src/runtime/agent-loop.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L101)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abortclass"></a> `abortClass?` | [`AbortClass`](/api/@rulvar/core/type-aliases/AbortClass.md) | The dedicated first-class abort class (M3-T08): present on the engine-decided no-progress abort (status 'limit'), never on user cancellation or ordinary cap hits. | [packages/core/src/runtime/agent-loop.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L144) |
| <a id="property-artifacts"></a> `artifacts?` | [`Artifact`](/api/@rulvar/core/interfaces/Artifact.md)[] | - | [packages/core/src/runtime/agent-loop.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L123) |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/runtime/agent-loop.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L105) |
| <a id="property-error"></a> `error?` | [`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md) | - | [packages/core/src/runtime/agent-loop.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L124) |
| <a id="property-errormessage"></a> `errorMessage?` | `string` | Human-readable detail behind `error` (provider message, first schema issue): feeds the journaled WireError message. An additive field; never part of identity. | [packages/core/src/runtime/agent-loop.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L130) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | Present if and only if status === 'escalated'. | [packages/core/src/runtime/agent-loop.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L132) |
| <a id="property-escalationrequest"></a> `escalationRequest?` | [`EscalationRequest`](/api/@rulvar/core/interfaces/EscalationRequest.md) | Engine-internal: the accepted escalate request before the runtime fills costToDate and salvage into the full report. The ctx layer consumes and removes it; consumers read `escalation`. | [packages/core/src/runtime/agent-loop.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L138) |
| <a id="property-output"></a> `output` | `T` \| `null` | - | [packages/core/src/runtime/agent-loop.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L103) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | The model that actually served the loop phase at the end (M4-T04): differs from the requested spec only under transport failover. | [packages/core/src/runtime/agent-loop.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L111) |
| <a id="property-status"></a> `status` | [`AgentStatus`](/api/@rulvar/core/type-aliases/AgentStatus.md) | - | [packages/core/src/runtime/agent-loop.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L102) |
| <a id="property-transcriptref"></a> `transcriptRef` | `string` | - | [packages/core/src/runtime/agent-loop.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L122) |
| <a id="property-turns"></a> `turns` | `number` | - | [packages/core/src/runtime/agent-loop.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L106) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/runtime/agent-loop.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L104) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Present only when the call spanned MORE THAN ONE (invocation role, serving model) pair (the loop, extract, finalize, and summarize roles resolve independently): usage split per (role, model), so `costUsd` and every cost bucket price each slice at its own rate and `CostReport.byRole` attributes each phase to its own bucket (v1.19.0 review P1-2). Absent for a single-phase single-model call, which (usage, servedBy) already describes exactly. | [packages/core/src/runtime/agent-loop.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L121) |
