[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelChoice

# Interface: ModelChoice

Defined in: [packages/core/src/l0/messages.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L196)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Absent: resolved by the chain, including role effort defaults. | [packages/core/src/l0/messages.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L199) |
| <a id="property-fallbacks"></a> `fallbacks?` | `` `${string}:${string}` ``[] | Transport-failure failover list; never enters identity. | [packages/core/src/l0/messages.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L203) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/core/src/l0/messages.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L197) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | Namespaced by adapter id. | [packages/core/src/l0/messages.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L201) |
