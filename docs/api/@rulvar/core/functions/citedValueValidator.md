[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / citedValueValidator

# Function: citedValueValidator()

```ts
function citedValueValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1459](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1459)

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

One span class is IDENTITY, not assertion (RV2502, the 1.226.0
comparison run): a span naming the artefact under review says which
commit, run, or release the document is about, and asserts nothing
about any cited line. That run's synthesis wrote its frozen commit
sha beside source citations and the validator demanded the sha appear
in the cited source, an impossible repair, in the same verdict that
demanded three real value fixes; two granted repairs burned and the
finish was rejected. Three shapes are structural and always excluded:
a commit sha (12 to 64 hex characters, long enough that ordinary hex
literals stay judged), a release version (`1.2.3`, `v1.2.3`, with an
optional prerelease or build tail), and the run's own id when the
runtime supplies `runId`. Host vocabulary is declared: `notValues`
lists spans this document writes as identity, verdict words like
`conditionally ready` among them.

The run-id exclusion is what makes the bundle self consistent
(RV2501, RV2202): the evidence grade instructs a failing model to
write this run's id inside the offending sentence, and before RV2502
doing so beside a citation traded an evidence-grade failure for a
cited-value one. The two repair instructions now compose.

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
| `options` | \{ `name?`: `string`; `notValues?`: readonly `string`[]; `pattern?`: `string`; `resolve`: (`target`) => `string` \| `undefined`; `window?`: `number`; \} | - |
| `options.name?` | `string` | - |
| `options.notValues?` | readonly `string`[] | Spans this host writes as IDENTITY rather than as a value asserted about a citation (RV2502), matched whole and case sensitively. Commit shas, versions, and the run's own id need no declaration. |
| `options.pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md); must capture `path:line`. |
| `options.resolve` | (`target`) => `string` \| `undefined` | - |
| `options.window?` | `number` | Lines AFTER the cited one that may carry the value; default 0. |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
