[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / latestProgressReport

# Function: latestProgressReport()

```ts
function latestProgressReport(messages): 
  | ProgressReport
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The deterministic terminal scan: pairs `report_progress` tool calls
with their SUCCESSFUL results by id (a denied or failed call never
counts, mirroring the exploration guard's restore) and normalizes the
last one into a [ProgressReport](/api/@rulvar/rulvar/interfaces/ProgressReport.md). Pure over the message window
it is given: the live loop hands its own history, the replay path
hands the terminal checkpoint's messages, and a compaction naturally
narrows the window to what the model itself still sees.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `messages` | readonly [`Msg`](/api/@rulvar/rulvar/interfaces/Msg.md)[] |

## Returns

  \| [`ProgressReport`](/api/@rulvar/rulvar/interfaces/ProgressReport.md)
  \| `undefined`
