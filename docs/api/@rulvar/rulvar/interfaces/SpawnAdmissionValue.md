[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpawnAdmissionValue

# Interface: SpawnAdmissionValue

Defined in: `packages/core/dist/index.d.ts`

The journaled spawn-admission payload the runtime writes and recovers.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-childscope"></a> `childScope` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-decision"></a> `decision` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"spawn-admission"` | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-orchestratorscope"></a> `orchestratorScope` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-origin"></a> `origin` | `"spawn_agent"` \| `"parallel_agents"` | `packages/core/dist/index.d.ts` |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-spawnordinal"></a> `spawnOrdinal` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `packages/core/dist/index.d.ts` |
