[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / selectStructuredOutputTier

# Function: selectStructuredOutputTier()

```ts
function selectStructuredOutputTier(caps, canonicalSchema): StructuredOutputTier;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Tier selection (docs/04, section 8.4): the model's declared ceiling
bounds the tier; the native tier additionally requires a
strict-compatible canonical schema (docs/04, section 5.2: relying on
silent server-side fallback is forbidden), degrading to forced-tool.
Prefill is not a tier.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) |
| `canonicalSchema` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) |

## Returns

[`StructuredOutputTier`](/api/@rulvar/rulvar/type-aliases/StructuredOutputTier.md)
