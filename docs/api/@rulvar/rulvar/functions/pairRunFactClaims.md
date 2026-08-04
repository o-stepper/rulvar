[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / pairRunFactClaims

# Function: pairRunFactClaims()

```ts
function pairRunFactClaims(
   draftText, 
   sheet, 
   options?): RunFactPairsFold;
```

Defined in: `packages/core/dist/index.d.ts`

Pairs draft sentences that speak about the RUN with the run's own
recorded fact sheet (RV1603), so the same judge invocation that rules
on source claims also rules on run claims. The eighteenth comparison
benchmark shipped both failure shapes this closes: a dossier claiming
"each role recorded 18-20 evidence entries" over recorded profiles of
23/18/22/20/20/20, and "real models were not run" beside 125 recorded
wire requests, with executionFacts ENABLED on the input side; facts
offered to the composer verify nothing about what it composed.

A sentence pairs when it names a minted id, a recorded fact value
(standalone, two digits or more, so a prose "6" cannot flood the
fold), or a caller-supplied term (case-insensitive). Pure and
deterministic like [pairDraftClaims](/api/@rulvar/rulvar/functions/pairDraftClaims.md); the sheet excerpt rides
every pair, capped at [MAX\_RUN\_FACTS\_SHEET\_CHARS](/api/@rulvar/rulvar/variables/MAX_RUN_FACTS_SHEET_CHARS.md).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `draftText` | `string` |
| `sheet` | [`RunFactsSheet`](/api/@rulvar/rulvar/interfaces/RunFactsSheet.md) |
| `options?` | [`RunFactPairOptions`](/api/@rulvar/rulvar/interfaces/RunFactPairOptions.md) |

## Returns

[`RunFactPairsFold`](/api/@rulvar/rulvar/interfaces/RunFactPairsFold.md)
