[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / normalizeM6Entries

# Function: normalizeM6Entries()

```ts
function normalizeM6Entries(entries): JournalEntry[];
```

Defined in: [packages/testing/src/cassettes/m6-orchestrator.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/cassettes/m6-orchestrator.ts#L46)

Fixes wall clock and spans; everything else is deterministic already.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]
