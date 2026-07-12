[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnRecord

# Interface: SpawnRecord

Defined in: [packages/core/src/orchestrator/handles.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L31)

One spawned child tracked by the orchestrator runtime.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abort"></a> `abort` | () => `void` | - | [packages/core/src/orchestrator/handles.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L39) |
| <a id="property-escalationflavor"></a> `escalationFlavor?` | `"A"` \| `"B"` | The spawn's escalation flavor, captured at dispatch. | [packages/core/src/orchestrator/handles.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L41) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L32) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/handles.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L35) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/handles.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L34) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt;\&gt; | Settles with the child's full result; never rejects. | [packages/core/src/orchestrator/handles.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L37) |
| <a id="property-settled"></a> `settled?` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | - | [packages/core/src/orchestrator/handles.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L38) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | - | [packages/core/src/orchestrator/handles.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L33) |
