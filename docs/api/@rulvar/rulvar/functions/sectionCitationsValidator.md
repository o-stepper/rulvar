[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sectionCitationsValidator

# Function: sectionCitationsValidator()

```ts
function sectionCitationsValidator(options): FinishValidator;
```

Defined in: `packages/core/dist/index.d.ts`

Requires at least `min` matches of `pattern` INSIDE every named
section (the v1.71 experiment review, P1.2: a total citation count
hides sections carrying zero provenance). A section's slice runs
from its FIRST occurrence to the next found section marker in text
position order, or to the end of the text; a marker absent from the
text is its own failure reason, because coverage of a missing
section cannot silently count as satisfied.
requiredSectionsValidator still owns plain presence. Default name
'section-citations'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `flags?`: `string`; `min`: `number`; `name?`: `string`; `pattern?`: `string`; `sections`: `string`[]; \} |
| `options.flags?` | `string` |
| `options.min` | `number` |
| `options.name?` | `string` |
| `options.pattern?` | `string` |
| `options.sections` | `string`[] |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)
