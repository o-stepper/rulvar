[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L332)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L338) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:341](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L341) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L333) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L337) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L335) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L334) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L339) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L336) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L340) |
