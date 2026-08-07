[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / minMatchesValidator

# Function: minMatchesValidator()

```ts
function minMatchesValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:842](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L842)

Requires at least `min` matches of `pattern` in the result text (the
plan's citation and source count checks: a file:line pattern, a URL
pattern). The pattern compiles at construction (invalid patterns are a
ConfigError before any run exists) and matches globally; `min` is a
positive integer. Default name 'min-matches'; pass `name` to run
several instances, because names must be unique per orchestrate call.
`fencedCode: 'excluded'` matches only outside fenced code blocks
(cycle 74), so citations quoted inside code samples do not count;
the default matches everything, byte identical to the historical
behavior.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `fencedCode?`: [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md); `flags?`: `string`; `min`: `number`; `name?`: `string`; `pattern`: `string`; \} |
| `options.fencedCode?` | [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md) |
| `options.flags?` | `string` |
| `options.min` | `number` |
| `options.name?` | `string` |
| `options.pattern` | `string` |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
