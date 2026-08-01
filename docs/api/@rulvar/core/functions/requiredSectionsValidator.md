[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / requiredSectionsValidator

# Function: requiredSectionsValidator()

```ts
function requiredSectionsValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:429](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L429)

Requires every named section to appear LITERALLY in the result text
(a heading like 'FINDINGS' or any marker the goal demands). Default
name 'required-sections'; pass `name` to run several instances.
`match: 'line'` demands each marker as its own line and
`fencedCode: 'excluded'` ignores markers inside fenced code blocks
(cycle 74); both default to the historical byte identical behavior.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `fencedCode?`: [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md); `match?`: [`SectionMatchMode`](/api/@rulvar/core/type-aliases/SectionMatchMode.md); `name?`: `string`; `sections`: readonly `string`[]; \} |
| `options.fencedCode?` | [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md) |
| `options.match?` | [`SectionMatchMode`](/api/@rulvar/core/type-aliases/SectionMatchMode.md) |
| `options.name?` | `string` |
| `options.sections` | readonly `string`[] |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
