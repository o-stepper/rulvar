[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L175)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L181) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L184) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L176) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L180) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L178) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L177) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L182) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L179) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L183) |
