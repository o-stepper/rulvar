[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PipelineCollected

# Interface: PipelineCollected\&lt;T\&gt;

Defined in: [packages/core/src/engine/ctx.ts:507](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L507)

Pipeline results plus the dropped evidence, returned by onItemError: 'collect'.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-dropped"></a> `dropped` | [`DroppedItem`](/api/@rulvar/core/interfaces/DroppedItem.md)[] | [packages/core/src/engine/ctx.ts:509](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L509) |
| <a id="property-results"></a> `results` | `T`[] | [packages/core/src/engine/ctx.ts:508](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L508) |
