[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelChoice

# Interface: ModelChoice

Defined in: [packages/core/src/l0/messages.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L189)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Absent: resolved by the chain, including role effort defaults. | [packages/core/src/l0/messages.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L192) |
| <a id="property-fallbacks"></a> `fallbacks?` | `` `${string}:${string}` ``[] | Transport-failure failover list; never enters identity. | [packages/core/src/l0/messages.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L196) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/core/src/l0/messages.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L190) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | Namespaced by adapter id. | [packages/core/src/l0/messages.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L194) |
