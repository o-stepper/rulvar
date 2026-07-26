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
'section-citations'. `match: 'line'` anchors each section at the
first line equal to its marker and `fencedCode: 'excluded'` removes
fenced code before anchoring, slicing, and counting (cycle 74), so a
marker echoed inside a code sample can neither anchor a slice nor
donate citations; both default to the historical behavior.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `fencedCode?`: [`FencedCodeMode`](/api/@rulvar/rulvar/type-aliases/FencedCodeMode.md); `flags?`: `string`; `match?`: [`SectionMatchMode`](/api/@rulvar/rulvar/type-aliases/SectionMatchMode.md); `min`: `number`; `name?`: `string`; `pattern?`: `string`; `sections`: readonly `string`[]; \} |
| `options.fencedCode?` | [`FencedCodeMode`](/api/@rulvar/rulvar/type-aliases/FencedCodeMode.md) |
| `options.flags?` | `string` |
| `options.match?` | [`SectionMatchMode`](/api/@rulvar/rulvar/type-aliases/SectionMatchMode.md) |
| `options.min` | `number` |
| `options.name?` | `string` |
| `options.pattern?` | `string` |
| `options.sections` | readonly `string`[] |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)
