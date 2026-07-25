[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / wordCountValidator

# Function: wordCountValidator()

```ts
function wordCountValidator(options): FinishValidator;
```

Defined in: `packages/core/dist/index.d.ts`

Requires the result text's word count (whitespace separated tokens;
an empty text counts zero) to sit inside the configured bounds (the
v1.71 experiment review, P0.7: a formal length requirement must be
code, never a natural-language plea the model may round away). At
least one bound is required; both are positive integers with
min <= max. Default name 'word-count'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `max?`: `number`; `min?`: `number`; `name?`: `string`; \} |
| `options.max?` | `number` |
| `options.min?` | `number` |
| `options.name?` | `string` |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)
