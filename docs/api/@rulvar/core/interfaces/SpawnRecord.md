[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnRecord

# Interface: SpawnRecord

Defined in: [packages/core/src/orchestrator/handles.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L164)

One spawned child tracked by the orchestrator runtime.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abort"></a> `abort` | () => `void` | - | [packages/core/src/orchestrator/handles.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L172) |
| <a id="property-escalationflavor"></a> `escalationFlavor?` | `"A"` \| `"B"` | The spawn's escalation flavor, captured at dispatch. | [packages/core/src/orchestrator/handles.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L174) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L165) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/handles.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L168) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/handles.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L167) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt;\&gt; | Settles with the child's full result; never rejects. | [packages/core/src/orchestrator/handles.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L170) |
| <a id="property-settled"></a> `settled?` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | - | [packages/core/src/orchestrator/handles.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L171) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | - | [packages/core/src/orchestrator/handles.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L166) |
