[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / citedValueValidator

# Function: citedValueValidator()

```ts
function citedValueValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1015](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1015)

Requires a cited location to actually carry the value the sentence
asserts (RV1212, the sixteenth comparison experiment P2-2). Citation
counting proves provenance was OFFERED, never that it holds: the
judge's own repro cited `retry.ts:24`, an interface declaration, for
a default that lives nine lines further down, and every
pattern-based check passed. This validator closes the loop with the
host's own source snapshot.

The rule is deliberate and narrow, so a failure is always
explainable: within one sentence, the inline-code spans that are NOT
citations are the values that sentence asserts about the citations
that are, and each asserted value must appear in the cited line (or
within `window` lines AFTER it, for a value the citation introduces)
as a WHOLE token, never a substring (RV1402): under `includes`, an
asserted `3` was satisfied by a line saying `30`, the seventeenth
comparison judge's repro. A sentence that cites without asserting an
inline value passes: the validator judges assertions, never prose
([citationTargetsValidator](/api/@rulvar/core/functions/citationTargetsValidator.md) judges every citation with no such
precondition).

`resolve` is host code and must be PURE over a snapshot the host
froze before the run, exactly like every other finish validator: a
resolver that reads the filesystem live would make a verdict depend
on when it ran and break replay. Returning `undefined` means the
location does not exist in the snapshot, which is itself a failure:
a citation nothing resolves is not provenance. Default name
'cited-value'.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `name?`: `string`; `pattern?`: `string`; `resolve`: (`target`) => `string` \| `undefined`; `window?`: `number`; \} | - |
| `options.name?` | `string` | - |
| `options.pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md); must capture `path:line`. |
| `options.resolve` | (`target`) => `string` \| `undefined` | - |
| `options.window?` | `number` | Lines AFTER the cited one that may carry the value; default 0. |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
