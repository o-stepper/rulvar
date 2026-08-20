[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / pairRunFactClaims

# Function: pairRunFactClaims()

```ts
function pairRunFactClaims(
   draftText, 
   sheet, 
   options?): RunFactPairsFold;
```

Defined in: [packages/core/src/orchestrator/consistency.ts:558](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L558)

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
deterministic like [pairDraftClaims](/api/@rulvar/core/functions/pairDraftClaims.md); the sheet excerpt rides
every pair, capped at [MAX\_RUN\_FACTS\_SHEET\_CHARS](/api/@rulvar/core/variables/MAX_RUN_FACTS_SHEET_CHARS.md).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `draftText` | `string` |
| `sheet` | [`RunFactsSheet`](/api/@rulvar/core/interfaces/RunFactsSheet.md) |
| `options?` | [`RunFactPairOptions`](/api/@rulvar/core/interfaces/RunFactPairOptions.md) |

## Returns

[`RunFactPairsFold`](/api/@rulvar/core/interfaces/RunFactPairsFold.md)
