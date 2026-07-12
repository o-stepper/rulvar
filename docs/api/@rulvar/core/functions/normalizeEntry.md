[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / normalizeEntry

# Function: normalizeEntry()

```ts
function normalizeEntry(raw): JournalEntry;
```

Defined in: [packages/core/src/l0/entries.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L165)

Round-1 normalization: hashVersion is taken from `hashVersion`, else
from the legacy `v` field, else 1. Stores are never rewritten;
normalization happens at read (docs/03, section "The single versioning
mechanism").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | `unknown` |

## Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)
