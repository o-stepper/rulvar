[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / requiredSectionsValidator

# Function: requiredSectionsValidator()

```ts
function requiredSectionsValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L93)

Requires every named section to appear LITERALLY in the result text
(a heading like 'FINDINGS' or any marker the goal demands). Default
name 'required-sections'; pass `name` to run several instances.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `name?`: `string`; `sections`: `string`[]; \} |
| `options.name?` | `string` |
| `options.sections` | `string`[] |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
