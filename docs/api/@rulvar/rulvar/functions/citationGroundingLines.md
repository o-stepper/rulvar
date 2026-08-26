[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / citationGroundingLines

# Function: citationGroundingLines()

```ts
function citationGroundingLines(findings, resolve): string[];
```

Defined in: `packages/core/dist/index.d.ts`

The grounding windows a citation repair round rides (RV4601): the
resolved unit of each judged anchor, so the composer repairs a
citation against the bytes the judge actually read instead of
guessing at a file it has never seen (the seventh comparison
experiment's candidate moved anchors blind). Recomputed from the
pure snapshot resolver at every prompt build, which is what keeps a
resumed round byte identical: nothing new persists, and a pure
resolver returns the same lines forever. Anchors that stopped
resolving, repeated anchors, and anything past the finding or
character budgets are silently absent; the block is an aid, never a
verdict surface.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `findings` | readonly `Pick`\&lt;[`CitationAuditFinding`](/api/@rulvar/rulvar/interfaces/CitationAuditFinding.md), `"anchor"`\&gt;[] |
| `resolve` | (`target`) => `string` \| `undefined` |

## Returns

`string`[]
