[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / wordCountValidator

# Function: wordCountValidator()

```ts
function wordCountValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L531)

Requires the result text's word count (whitespace separated tokens;
an empty text counts zero) to sit inside the configured bounds (the
v1.71 experiment review, P0.7: a formal length requirement must be
code, never a natural-language plea the model may round away). At
least one bound is required; both are positive integers with
min <= max. Default name 'word-count'. `fencedCode: 'excluded'`
counts only words outside fenced code blocks (cycle 74), so code
samples cannot pad a length requirement; the default counts
everything, byte identical to the historical behavior.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `fencedCode?`: [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md); `max?`: `number`; `min?`: `number`; `name?`: `string`; \} |
| `options.fencedCode?` | [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md) |
| `options.max?` | `number` |
| `options.min?` | `number` |
| `options.name?` | `string` |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
