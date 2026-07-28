[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / journalPricingSnapshot

# Function: journalPricingSnapshot()

```ts
function journalPricingSnapshot(entries): 
  | JournalPricingSnapshot
  | undefined;
```

Defined in: [packages/core/src/engine/pricing-snapshot.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L141)

The read side: the LAST run-settle decision carrying a pricing pin
wins (each settling segment re-pins the union it applied, so the last
one covers every model of the journal it settled). Journals settled
before the pin shipped, or without any priced model, return
undefined: the caller keeps its current-table fold and its export
says so.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

  \| [`JournalPricingSnapshot`](/api/@rulvar/core/interfaces/JournalPricingSnapshot.md)
  \| `undefined`
