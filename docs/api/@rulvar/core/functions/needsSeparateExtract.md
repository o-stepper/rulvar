[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / needsSeparateExtract

# Function: needsSeparateExtract()

```ts
function needsSeparateExtract(input): boolean;
```

Defined in: [packages/core/src/model/roles.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L66)

The completed extract-necessity rule: a separate final structured-output
invocation fires only when a schema is set AND (routing directs extract
to a different model OR the loop model's caps cannot serve the required
tier OR finalize is routed, in which case the schema never rides a loop
or synthesis turn). Otherwise the schema rides the last loop turn with
no extra call (as amended in M4-T01).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`ExtractNecessityInput`](/api/@rulvar/core/interfaces/ExtractNecessityInput.md) |

## Returns

`boolean`
