[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PipelineCollected

# Interface: PipelineCollected\&lt;T\&gt;

Defined in: `packages/core/dist/index.d.ts`

Pipeline results plus the dropped evidence, returned by onItemError: 'collect'.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-dropped"></a> `dropped` | [`DroppedItem`](/api/@rulvar/rulvar/interfaces/DroppedItem.md)[] | `packages/core/dist/index.d.ts` |
| <a id="property-results"></a> `results` | `T`[] | `packages/core/dist/index.d.ts` |
