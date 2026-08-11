[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / toolCalibrationFromJournal

# Function: toolCalibrationFromJournal()

```ts
function toolCalibrationFromJournal(entries): ToolCalibrationReport;
```

Defined in: `packages/core/dist/index.d.ts`

Folds the observed tool-budget calibration from a journal (RV3003):
every terminal agent entry is partitioned by which sides of the
evidence/counter pair it recorded, the paired rows carry their
per-dispatch rate, and the aggregate is the number a host compares
against its declared `estCallsPerEntry`. Pure over the entries, so
live and resumed journals fold identically; nothing is re-derived
and no checkpoint blob is read.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

[`ToolCalibrationReport`](/api/@rulvar/rulvar/interfaces/ToolCalibrationReport.md)
