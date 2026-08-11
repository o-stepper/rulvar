[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / synthesisCandidatesFromJournal

# Function: synthesisCandidatesFromJournal()

```ts
function synthesisCandidatesFromJournal(entries, priceUsd?): JournaledSynthesisCandidateReport;
```

Defined in: `packages/core/dist/index.d.ts`

Fold the finish candidates (RV2902) out of a run's journal: each
journaled validation verdict with the window of wall, wires, usage,
and priced cost that produced the candidate it judged.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] | the journal of one run, in any order |
| `priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | prices one call's usage at its serving model, the same shape `invoiceFromJournal` takes; omit to fold without money |

## Returns

[`JournaledSynthesisCandidateReport`](/api/@rulvar/rulvar/interfaces/JournaledSynthesisCandidateReport.md)
