[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / normalizeEntry

# Function: normalizeEntry()

```ts
function normalizeEntry(raw): JournalEntry;
```

Defined in: `packages/core/dist/index.d.ts`

Round-1 normalization: hashVersion is taken from `hashVersion`, else
from the legacy `v` field, else 1. Stores are never rewritten;
normalization happens at read.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | `unknown` |

## Returns

[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)
