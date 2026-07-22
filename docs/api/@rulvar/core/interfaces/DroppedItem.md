[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DroppedItem

# Interface: DroppedItem

Defined in: [packages/core/src/engine/ctx.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L228)

One dropped result: its source, scope, entry ref, and wire error.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef?` | `number` | Seq of the terminal journal entry when one exists. | [packages/core/src/engine/ctx.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L233) |
| <a id="property-error"></a> `error` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/engine/ctx.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L235) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/engine/ctx.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L234) |
| <a id="property-scope"></a> `scope` | `string` | Scope path of the failed call. | [packages/core/src/engine/ctx.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L231) |
| <a id="property-source"></a> `source` | `"pipeline"` \| `"agent-onerror-null"` \| `"parallel-settled"` | - | [packages/core/src/engine/ctx.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L229) |
