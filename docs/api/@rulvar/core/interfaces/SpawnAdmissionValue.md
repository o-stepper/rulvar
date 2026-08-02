[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: [packages/core/src/orchestrator/handles.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L247)

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | [packages/core/src/orchestrator/handles.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L253) |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L256) |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | [packages/core/src/orchestrator/handles.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L248) |
| <a id="property-name"></a> `name` | `string` | [packages/core/src/orchestrator/handles.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L252) |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | [packages/core/src/orchestrator/handles.ts:250](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L250) |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | [packages/core/src/orchestrator/handles.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L249) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | [packages/core/src/orchestrator/handles.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L254) |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | [packages/core/src/orchestrator/handles.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L251) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/orchestrator/handles.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L255) |
