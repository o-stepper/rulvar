[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L317)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L323) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:326](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L326) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L318) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L322) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L320) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L319) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L324) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L321) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L325) |
