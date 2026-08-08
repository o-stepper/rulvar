[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sectionPatternCountValidator

# Function: sectionPatternCountValidator()

```ts
function sectionPatternCountValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:777](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L777)

Counted collections inside named sections (RV2206, the subscription
parity series). The engine validated citations per section since the
v1.71 review, but the numbered collections the parity contract
demands (48 N-case ids, 16 counterexample ids) were policed by
nothing: the second accepted dossier carried 0 and 0 against an
instruction naming both, and only a runner-side format pre-teach
closed the gap, by hope rather than contract. Each entry slices its
section exactly like sectionCitationsValidator (first marker
occurrence to the next marker in position order) and counts matches,
DISTINCT by first capture when the pattern captures; the reasons
name the section, the label, the found count against the minimum,
and with a capturing pattern the missing count in ids, so a repair
turn knows exactly what to add (the RV2105 lesson). Default name
'section-pattern-counts'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `entries`: readonly [`SectionPatternEntry`](/api/@rulvar/core/interfaces/SectionPatternEntry.md)[]; `fencedCode?`: [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md); `match?`: [`SectionMatchMode`](/api/@rulvar/core/type-aliases/SectionMatchMode.md); `name?`: `string`; `sections`: readonly `string`[]; \} |
| `options.entries` | readonly [`SectionPatternEntry`](/api/@rulvar/core/interfaces/SectionPatternEntry.md)[] |
| `options.fencedCode?` | [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md) |
| `options.match?` | [`SectionMatchMode`](/api/@rulvar/core/type-aliases/SectionMatchMode.md) |
| `options.name?` | `string` |
| `options.sections` | readonly `string`[] |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
