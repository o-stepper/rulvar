[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L185)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L191) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L194) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L186) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L190) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L188) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L187) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L192) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L189) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L193) |
