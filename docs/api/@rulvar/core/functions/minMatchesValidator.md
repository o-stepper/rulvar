[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / minMatchesValidator

# Function: minMatchesValidator()

```ts
function minMatchesValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L126)

Requires at least `min` matches of `pattern` in the result text (the
plan's citation and source count checks: a file:line pattern, a URL
pattern). The pattern compiles at construction (invalid patterns are a
ConfigError before any run exists) and matches globally; `min` is a
positive integer. Default name 'min-matches'; pass `name` to run
several instances, because names must be unique per orchestrate call.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `flags?`: `string`; `min`: `number`; `name?`: `string`; `pattern`: `string`; \} |
| `options.flags?` | `string` |
| `options.min` | `number` |
| `options.name?` | `string` |
| `options.pattern` | `string` |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
