[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / pairDraftClaims

# Function: pairDraftClaims()

```ts
function pairDraftClaims(
   draftText, 
   rows, 
   options?): ClaimPairsFold;
```

Defined in: [packages/core/src/orchestrator/consistency.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L233)

Folds the composed draft against the settled pool it composed from:
every draft sentence citing an anchor is paired with the pool
sentences citing an intersecting span of the same file, verbatim
agreement dropped. Pure and deterministic: the output depends only on
the input order and bytes, so a resumed run re-derives it without
journaling anything (the `findContradictions` precedent).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `draftText` | `string` |
| `rows` | readonly [`ContradictionSource`](/api/@rulvar/core/interfaces/ContradictionSource.md)[] |
| `options?` | [`ClaimPairOptions`](/api/@rulvar/core/interfaces/ClaimPairOptions.md) |

## Returns

[`ClaimPairsFold`](/api/@rulvar/core/interfaces/ClaimPairsFold.md)
