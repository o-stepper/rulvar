[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / evidenceGradeValidator

# Function: evidenceGradeValidator()

```ts
function evidenceGradeValidator(options?): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:920](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L920)

Requires every evidence-GRADE claim to point at an artifact (RV1212).
A sentence that says `live-observed`, `provider bill`, or
`production-proven` is claiming the report watched it happen, and a
claim of that grade with nothing to check it against is the most
expensive kind of wrong: the sixteenth comparison run's answer used
the register about a runtime its own live run never observed, and
every reader-side check passed because the text was well formed.
The rule is deliberately local and deterministic: the artifact
reference must appear in the SAME sentence as the phrase (a run id
or a `path:line` citation by default), so moving the evidence three
paragraphs away no longer satisfies the grade. Purely textual: what
the referenced artifact contains is
[citedValueValidator](/api/@rulvar/core/functions/citedValueValidator.md)'s question, and whether it exists on
disk is the host's. Default name 'evidence-grade'.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | \{ `artifactPattern?`: `string`; `name?`: `string`; `phrases?`: readonly `string`[]; \} | - |
| `options.artifactPattern?` | `string` | Overrides [DEFAULT\_ARTIFACT\_PATTERN](/api/@rulvar/core/variables/DEFAULT_ARTIFACT_PATTERN.md). |
| `options.name?` | `string` | - |
| `options.phrases?` | readonly `string`[] | Overrides [DEFAULT\_EVIDENCE\_GRADE\_PHRASES](/api/@rulvar/core/variables/DEFAULT_EVIDENCE_GRADE_PHRASES.md); matched case-insensitively. |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
