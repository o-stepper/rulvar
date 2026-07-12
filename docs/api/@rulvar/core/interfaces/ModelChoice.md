[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelChoice

# Interface: ModelChoice

Defined in: [packages/core/src/l0/messages.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L197)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Absent: resolved by the chain, including role effort defaults. | [packages/core/src/l0/messages.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L200) |
| <a id="property-fallbacks"></a> `fallbacks?` | `` `${string}:${string}` ``[] | Transport-failure failover list; never enters identity (docs/04, section "RetryPolicy and failover"). | [packages/core/src/l0/messages.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L204) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/core/src/l0/messages.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L198) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | Namespaced by adapter id (docs/04, section "providerOptions and providerMetadata namespacing"). | [packages/core/src/l0/messages.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L202) |
