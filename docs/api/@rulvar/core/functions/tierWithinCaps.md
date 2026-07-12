[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / tierWithinCaps

# Function: tierWithinCaps()

```ts
function tierWithinCaps(tier, caps): boolean;
```

Defined in: [packages/core/src/model/caps.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/caps.ts#L98)

True when `tier` is at or below the model's declared ceiling.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `tier` | [`StructuredOutputTier`](/api/@rulvar/core/type-aliases/StructuredOutputTier.md) |
| `caps` | [`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md) |

## Returns

`boolean`
