[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpawnRecord

# Interface: SpawnRecord

Defined in: `packages/core/dist/index.d.ts`

One spawned child tracked by the orchestrator runtime.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abort"></a> `abort` | () => `void` | - | `packages/core/dist/index.d.ts` |
| <a id="property-escalationflavor"></a> `escalationFlavor?` | `"A"` \| `"B"` | The spawn's escalation flavor, captured at dispatch. | `packages/core/dist/index.d.ts` |
| <a id="property-handle"></a> `handle` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt;\&gt; | Settles with the child's full result; never rejects. | `packages/core/dist/index.d.ts` |
| <a id="property-settled"></a> `settled?` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | - | `packages/core/dist/index.d.ts` |
