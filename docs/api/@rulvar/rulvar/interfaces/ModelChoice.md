[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelChoice

# Interface: ModelChoice

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | Absent: resolved by the chain, including role effort defaults. | `packages/core/dist/index.d.ts` |
| <a id="property-fallbacks"></a> `fallbacks?` | `` `${string}:${string}` ``[] | Transport-failure failover list; never enters identity. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | Namespaced by adapter id. | `packages/core/dist/index.d.ts` |
