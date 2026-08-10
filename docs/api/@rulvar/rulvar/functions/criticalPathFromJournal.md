[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / criticalPathFromJournal

# Function: criticalPathFromJournal()

```ts
function criticalPathFromJournal(entries): JournaledCriticalPath;
```

Defined in: `packages/core/dist/index.d.ts`

Fold a run's critical path out of its journal.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] | the journal of one run, in any order |

## Returns

[`JournaledCriticalPath`](/api/@rulvar/rulvar/interfaces/JournaledCriticalPath.md)
