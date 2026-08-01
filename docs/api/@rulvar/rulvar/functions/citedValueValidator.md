[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / citedValueValidator

# Function: citedValueValidator()

```ts
function citedValueValidator(options): FinishValidator;
```

Defined in: `packages/core/dist/index.d.ts`

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
within `window` lines AFTER it, for a value the citation introduces).
A sentence that cites without asserting an inline value passes: the
validator judges assertions, never prose.

`resolve` is host code and must be PURE over a snapshot the host
froze before the run, exactly like every other finish validator: a
resolver that reads the filesystem live would make a verdict depend
on when it ran and break replay. Returning `undefined` means the
location does not exist in the snapshot, which is itself a failure:
a citation nothing resolves is not provenance. Default name
'cited-value'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `name?`: `string`; `pattern?`: `string`; `resolve`: (`target`) => `string` \| `undefined`; `window?`: `number`; \} |
| `options.name?` | `string` |
| `options.pattern?` | `string` |
| `options.resolve` | (`target`) => `string` \| `undefined` |
| `options.window?` | `number` |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)
