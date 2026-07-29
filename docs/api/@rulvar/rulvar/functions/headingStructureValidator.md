[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / headingStructureValidator

# Function: headingStructureValidator()

```ts
function headingStructureValidator(options): FinishValidator;
```

Defined in: `packages/core/dist/index.d.ts`

Judges the markdown HEADING STRUCTURE of the result (the sixth
comparison experiment; the judge's P1.3): line presence proves each
declared heading EXISTS, not that the document carries them in the
declared order without extras. The sections must all start with the
SAME markdown heading marker (an identical count of leading '#'
characters, one to six, followed by whitespace); the governed level
derives from that marker. Fenced code is ALWAYS stripped first,
because a '## ' line inside a code sample is not a heading in
rendered markdown, so a fenced fake can neither satisfy a declared
heading nor trip exclusivity. Heading lines compare trimmed, whole
line. With `ordered` (default true) the declared headings must
appear in declaration order; with `exclusive` (default true) each
declared heading must appear once, unrepeated, and no undeclared heading
of the governed level may exist (other levels stay free). Default
name 'heading-structure'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `exclusive?`: `boolean`; `name?`: `string`; `ordered?`: `boolean`; `sections`: readonly `string`[]; \} |
| `options.exclusive?` | `boolean` |
| `options.name?` | `string` |
| `options.ordered?` | `boolean` |
| `options.sections` | readonly `string`[] |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)
