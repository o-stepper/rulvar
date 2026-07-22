[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / requiredFieldsValidator

# Function: requiredFieldsValidator()

```ts
function requiredFieldsValidator(options): FinishValidator;
```

Defined in: `packages/core/dist/index.d.ts`

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

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)
