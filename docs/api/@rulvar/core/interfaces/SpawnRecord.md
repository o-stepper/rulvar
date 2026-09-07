[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnRecord

# Interface: SpawnRecord

Defined in: [packages/core/src/orchestrator/handles.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L173)

One spawned child tracked by the orchestrator runtime.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abort"></a> `abort` | () => `void` | - | [packages/core/src/orchestrator/handles.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L187) |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `number` | The child's declared money (RV4906): the spawn's `budgetUsd`, else the profile's `estCost`; absent when neither was declared. Read by the acceptance fold's binding constraint profile. | [packages/core/src/orchestrator/handles.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L186) |
| <a id="property-escalationflavor"></a> `escalationFlavor?` | `"A"` \| `"B"` | The spawn's escalation flavor, captured at dispatch. | [packages/core/src/orchestrator/handles.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L189) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L174) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/handles.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L177) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/handles.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L176) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt;\&gt; | Settles with the child's full result; never rejects. | [packages/core/src/orchestrator/handles.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L179) |
| <a id="property-settled"></a> `settled?` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | - | [packages/core/src/orchestrator/handles.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L180) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | - | [packages/core/src/orchestrator/handles.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L175) |
