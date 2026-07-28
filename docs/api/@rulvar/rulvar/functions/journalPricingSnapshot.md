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

The read side. Every settling segment pins the union it applied, and
each pin's settle seq bounds the rows it settled FIRST, so the pins
compose without any journal change (RV505): a seq-aware caller gets
the rates of the row's own segment, and a seq-less caller keeps the
historical last-pin behavior. Journals settled before the pin
shipped, or without any priced model, return undefined: the caller
keeps its current-table fold and its export says so.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

  \| [`JournalPricingSnapshot`](/api/@rulvar/rulvar/interfaces/JournalPricingSnapshot.md)
  \| `undefined`
