[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toolCalibrationFromJournal

# Function: toolCalibrationFromJournal()

```ts
function toolCalibrationFromJournal(entries): ToolCalibrationReport;
```

Defined in: [packages/core/src/stores/tool-calibration.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L99)

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
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

[`ToolCalibrationReport`](/api/@rulvar/core/interfaces/ToolCalibrationReport.md)
