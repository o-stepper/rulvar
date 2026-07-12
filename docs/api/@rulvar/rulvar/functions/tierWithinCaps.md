[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / tierWithinCaps

# Function: tierWithinCaps()

```ts
function tierWithinCaps(tier, caps): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

True when `tier` is at or below the model's declared ceiling.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `tier` | [`StructuredOutputTier`](/api/@rulvar/rulvar/type-aliases/StructuredOutputTier.md) |
| `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) |

## Returns

`boolean`
