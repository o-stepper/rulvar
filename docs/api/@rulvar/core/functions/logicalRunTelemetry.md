[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / logicalRunTelemetry

# Function: logicalRunTelemetry()

```ts
function logicalRunTelemetry(entries): LogicalRunTelemetry;
```

Defined in: [packages/core/src/stores/reconcile.ts:390](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L390)

Folds a run's journal into the logical run's telemetry (RV2510): how
many segments ran, how each settled, and how much durable work each
one did, from entries the journal already holds. No new field, so it
reads journals written by every prior version exactly as well as
today's.

The replay dedup is the design. Cumulative figures are deliberately
NOT here: money and usage fold from the WHOLE journal through
`costReportFromJournal` and the usage ledger, and re-summing them per
segment would count every replayed operation once per segment that
replayed it, which is exactly the reconciliation this fold exists to
make unnecessary. What it reports instead is a PARTITION of the
journal by settle boundary, so no entry is counted twice by
construction, and the segment-scoped figures a terminal carries
([TERMINAL\_TELEMETRY\_SCOPE](/api/@rulvar/core/variables/TERMINAL_TELEMETRY_SCOPE.md) names them) can be read against the
segment that produced them.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

[`LogicalRunTelemetry`](/api/@rulvar/core/interfaces/LogicalRunTelemetry.md)
