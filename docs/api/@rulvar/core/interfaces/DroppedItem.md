[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DroppedItem

# Interface: DroppedItem

Defined in: [packages/core/src/engine/ctx.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L237)

One dropped result: its source, scope, entry ref, and wire error.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef?` | `number` | Seq of the terminal journal entry when one exists. | [packages/core/src/engine/ctx.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L242) |
| <a id="property-error"></a> `error` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/engine/ctx.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L244) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/engine/ctx.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L243) |
| <a id="property-scope"></a> `scope` | `string` | Scope path of the failed call. | [packages/core/src/engine/ctx.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L240) |
| <a id="property-source"></a> `source` | `"pipeline"` \| `"agent-onerror-null"` \| `"parallel-settled"` | - | [packages/core/src/engine/ctx.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L238) |
