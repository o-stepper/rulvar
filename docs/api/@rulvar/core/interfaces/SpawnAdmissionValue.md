[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L105)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L111) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L114) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L106) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L110) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L108) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L107) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L112) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L109) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L113) |
