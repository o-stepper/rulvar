[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / needsSeparateExtract

# Function: needsSeparateExtract()

```ts
function needsSeparateExtract(input): boolean;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The completed extract-necessity rule: a separate final structured-output
invocation fires only when a schema is set AND (routing directs extract
to a different model OR the loop model's caps cannot serve the required
tier OR finalize is routed, in which case the schema never rides a loop
or synthesis turn). Otherwise the schema rides the last loop turn with
no extra call (docs/04, sections 8.3 and 8.4 as amended in M4-T01).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`ExtractNecessityInput`](/api/@rulvar/rulvar/interfaces/ExtractNecessityInput.md) |

## Returns

`boolean`
