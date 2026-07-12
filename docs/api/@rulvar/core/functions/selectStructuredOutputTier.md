[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / selectStructuredOutputTier

# Function: selectStructuredOutputTier()

```ts
function selectStructuredOutputTier(caps, canonicalSchema): StructuredOutputTier;
```

Defined in: [packages/core/src/model/caps.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/caps.ts#L86)

Tier selection (docs/04, section 8.4): the model's declared ceiling
bounds the tier; the native tier additionally requires a
strict-compatible canonical schema (docs/04, section 5.2: relying on
silent server-side fallback is forbidden), degrading to forced-tool.
Prefill is not a tier.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `caps` | [`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md) |
| `canonicalSchema` | [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) |

## Returns

[`StructuredOutputTier`](/api/@rulvar/core/type-aliases/StructuredOutputTier.md)
