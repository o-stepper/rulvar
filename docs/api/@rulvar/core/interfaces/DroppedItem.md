[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DroppedItem

# Interface: DroppedItem

Defined in: [packages/core/src/engine/ctx.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L240)

One dropped result: its source, scope, entry ref, and wire error.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef?` | `number` | Seq of the terminal journal entry when one exists. | [packages/core/src/engine/ctx.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L245) |
| <a id="property-error"></a> `error` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/engine/ctx.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L247) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/engine/ctx.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L246) |
| <a id="property-scope"></a> `scope` | `string` | Scope path of the failed call. | [packages/core/src/engine/ctx.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L243) |
| <a id="property-source"></a> `source` | `"pipeline"` \| `"agent-onerror-null"` \| `"parallel-settled"` | - | [packages/core/src/engine/ctx.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L241) |
