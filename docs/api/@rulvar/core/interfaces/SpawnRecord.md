[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnRecord

# Interface: SpawnRecord

Defined in: [packages/core/src/orchestrator/handles.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L81)

One spawned child tracked by the orchestrator runtime.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abort"></a> `abort` | () => `void` | - | [packages/core/src/orchestrator/handles.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L89) |
| <a id="property-escalationflavor"></a> `escalationFlavor?` | `"A"` \| `"B"` | The spawn's escalation flavor, captured at dispatch. | [packages/core/src/orchestrator/handles.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L91) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L82) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/handles.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L85) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/handles.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L84) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt;\&gt; | Settles with the child's full result; never rejects. | [packages/core/src/orchestrator/handles.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L87) |
| <a id="property-settled"></a> `settled?` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | - | [packages/core/src/orchestrator/handles.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L88) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | - | [packages/core/src/orchestrator/handles.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L83) |
