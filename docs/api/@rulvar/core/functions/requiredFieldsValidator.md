[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / requiredFieldsValidator

# Function: requiredFieldsValidator()

```ts
function requiredFieldsValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L119)

Requires the result to be a JSON object carrying every named field
with a substantial value: present, not null, and not an empty or
whitespace only string (empty arrays, zero, and false COUNT as
present; emptiness rules beyond strings belong to a custom
validator). Default name 'required-fields'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `fields`: `string`[]; `name?`: `string`; \} |
| `options.fields` | `string`[] |
| `options.name?` | `string` |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
