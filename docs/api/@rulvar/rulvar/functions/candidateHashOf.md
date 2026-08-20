[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / candidateHashOf

# Function: candidateHashOf()

```ts
function candidateHashOf(candidate): string;
```

Defined in: `packages/core/dist/index.d.ts`

THE candidate hash recipe (RV4207), written down where the fold that
reads it lives: sha256 (hex) over the JCS canonical serialization of
the candidate VALUE, `null` for an absent one. This is the recipe
behind every `candidateHash` a finish-validation decision journals,
the claim judge's `judgedHash`, the citation audit's `auditedHash`,
and `draftToFinal`'s pair, so one function answers "which document"
across every surface. Two facts an auditor needs spelled out: a
STRING document hashes as its JSON encoding (the quotes and escapes
included), not as raw text bytes; and exporting the text to a file
with a trailing newline changes the FILE's sha256 while this hash is
unchanged, verify against the exact value, never the file. The sixth
comparison experiment's auditor re-derived all of this from source
because no exported function said it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `candidate` | `unknown` |

## Returns

`string`
