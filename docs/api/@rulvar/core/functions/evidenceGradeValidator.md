[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / evidenceGradeValidator

# Function: evidenceGradeValidator()

```ts
function evidenceGradeValidator(options?): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1116)

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
disk is the host's.

The run's OWN id is an artifact (RV2501). `DEFAULT_ARTIFACT_PATTERN`
only ever matched the literal word `run` followed by a ULID, so the
escape the verdict advertised was unreachable for every run whose id
the engine did not mint in that exact shape: the comparison run's
`comparison-rulvar-v12260-aug09-...` matched nothing, its synthesis
had no artifact it could name, and a document that told the truth
about the run it was part of could not be written at all. When
[FinishValidationInput.runId](/api/@rulvar/core/interfaces/FinishValidationInput.md#property-runid) is supplied (the orchestrator
runtime always supplies it), a sentence carrying that id verbatim as
a whole token satisfies the grade, and the verdict names the id so
the repair instruction is executable rather than aspirational. An id
shorter than `MIN_RUN_ID_ARTIFACT_CHARS` (six) is ignored, and
without an id the verdict is byte identical to the historical one.
Default name 'evidence-grade'.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | \{ `artifactPattern?`: `string`; `name?`: `string`; `phrases?`: readonly `string`[]; \} | - |
| `options.artifactPattern?` | `string` | Overrides [DEFAULT\_ARTIFACT\_PATTERN](/api/@rulvar/core/variables/DEFAULT_ARTIFACT_PATTERN.md). |
| `options.name?` | `string` | - |
| `options.phrases?` | readonly `string`[] | Overrides [DEFAULT\_EVIDENCE\_GRADE\_PHRASES](/api/@rulvar/core/variables/DEFAULT_EVIDENCE_GRADE_PHRASES.md); matched case-insensitively. |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
