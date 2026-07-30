[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DroppedItem

# Interface: DroppedItem

Defined in: [packages/core/src/engine/ctx.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L294)

One dropped result: its source, scope, entry ref, and wire error.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef?` | `number` | Seq of the terminal journal entry when one exists. | [packages/core/src/engine/ctx.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L299) |
| <a id="property-error"></a> `error` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/engine/ctx.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L301) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/engine/ctx.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L300) |
| <a id="property-scope"></a> `scope` | `string` | Scope path of the failed call. | [packages/core/src/engine/ctx.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L297) |
| <a id="property-source"></a> `source` | `"pipeline"` \| `"agent-onerror-null"` \| `"parallel-settled"` | - | [packages/core/src/engine/ctx.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L295) |
