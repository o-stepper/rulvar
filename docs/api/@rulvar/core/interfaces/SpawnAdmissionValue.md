[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L275)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L281) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L284) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L276) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L280) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L278) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L277) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L282) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L279) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L283) |
