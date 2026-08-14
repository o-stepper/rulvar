[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / criticalPathFromJournal

# Function: criticalPathFromJournal()

```ts
function criticalPathFromJournal(entries): JournaledCriticalPath;
```

Defined in: [packages/core/src/stores/critical-path.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L165)

Fold a run's critical path out of its journal.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] | the journal of one run, in any order |

## Returns

[`JournaledCriticalPath`](/api/@rulvar/core/interfaces/JournaledCriticalPath.md)
