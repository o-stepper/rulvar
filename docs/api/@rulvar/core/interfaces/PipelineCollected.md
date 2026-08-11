[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PipelineCollected

# Interface: PipelineCollected\&lt;T\&gt;

Defined in: [packages/core/src/engine/ctx.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L464)

Pipeline results plus the dropped evidence, returned by onItemError: 'collect'.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-dropped"></a> `dropped` | [`DroppedItem`](/api/@rulvar/core/interfaces/DroppedItem.md)[] | [packages/core/src/engine/ctx.ts:466](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L466) |
| <a id="property-results"></a> `results` | `T`[] | [packages/core/src/engine/ctx.ts:465](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L465) |
