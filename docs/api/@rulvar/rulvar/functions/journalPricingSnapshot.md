[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / journalPricingSnapshot

# Function: journalPricingSnapshot()

```ts
function journalPricingSnapshot(entries): 
  | JournalPricingSnapshot
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The read side: the LAST run-settle decision carrying a pricing pin
wins (each settling segment re-pins the union it applied, so the last
one covers every model of the journal it settled). Journals settled
before the pin shipped, or without any priced model, return
undefined: the caller keeps its current-table fold and its export
says so.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

  \| [`JournalPricingSnapshot`](/api/@rulvar/rulvar/interfaces/JournalPricingSnapshot.md)
  \| `undefined`
