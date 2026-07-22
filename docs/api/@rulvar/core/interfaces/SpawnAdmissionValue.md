[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L166)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L172) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L175) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L167) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L171) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L169) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L168) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L173) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L170) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L174) |
