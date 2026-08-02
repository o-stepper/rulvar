[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnRecord

# Interface: SpawnRecord

Defined in: [packages/core/src/orchestrator/handles.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L136)

One spawned child tracked by the orchestrator runtime.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abort"></a> `abort` | () => `void` | - | [packages/core/src/orchestrator/handles.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L144) |
| <a id="property-escalationflavor"></a> `escalationFlavor?` | `"A"` \| `"B"` | The spawn's escalation flavor, captured at dispatch. | [packages/core/src/orchestrator/handles.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L146) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L137) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/handles.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L140) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/handles.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L139) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt;\&gt; | Settles with the child's full result; never rejects. | [packages/core/src/orchestrator/handles.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L142) |
| <a id="property-settled"></a> `settled?` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | - | [packages/core/src/orchestrator/handles.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L143) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | - | [packages/core/src/orchestrator/handles.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L138) |
