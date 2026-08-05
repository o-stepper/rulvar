[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnRecord

# Interface: SpawnRecord

Defined in: [packages/core/src/orchestrator/handles.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L144)

One spawned child tracked by the orchestrator runtime.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abort"></a> `abort` | () => `void` | - | [packages/core/src/orchestrator/handles.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L152) |
| <a id="property-escalationflavor"></a> `escalationFlavor?` | `"A"` \| `"B"` | The spawn's escalation flavor, captured at dispatch. | [packages/core/src/orchestrator/handles.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L154) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L145) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/handles.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L148) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/handles.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L147) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt;\&gt; | Settles with the child's full result; never rejects. | [packages/core/src/orchestrator/handles.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L150) |
| <a id="property-settled"></a> `settled?` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | - | [packages/core/src/orchestrator/handles.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L151) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | - | [packages/core/src/orchestrator/handles.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L146) |
