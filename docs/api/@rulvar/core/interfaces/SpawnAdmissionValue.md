[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L266)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L272) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L275) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L267) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L271) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L269) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L268) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L273) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L270) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L274) |
