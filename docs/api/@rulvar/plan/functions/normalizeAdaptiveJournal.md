[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / normalizeAdaptiveJournal

# Function: normalizeAdaptiveJournal()

```ts
function normalizeAdaptiveJournal(entries): JournalEntry[];
```

Defined in: [packages/plan/src/cassettes.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L49)

Normalizes one journal for cassette comparison: ULIDs and sha256
strings map to first-appearance placeholders; wall clock, spans, and
transcript refs collapse to fixtures. Deterministic given a
deterministic entry stream.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]
