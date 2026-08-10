[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TelemetryScope

# Type Alias: TelemetryScope

```ts
type TelemetryScope = "segment" | "cumulative" | "terminal";
```

Defined in: [packages/core/src/stores/reconcile.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L191)

Whether a terminal figure counts THIS segment's work or the whole
logical run (RV2510).

* `'segment'`: only the segment that produced this terminal. A
  resumed run reports the resumed segment's number, and the figure
  for the logical run is the SUM over every segment
  ([logicalRunTelemetry](/api/@rulvar/core/functions/logicalRunTelemetry.md) computes it).
* `'cumulative'`: the whole logical run, every prior segment
  included, because the figure folds from the journal (money, usage),
  resumes from the journaled ledger (the spawn count), or is
  RE-DERIVED by replay (the loss list: a resumed segment re-executes
  the workflow and reads the same journaled terminals, so the drops
  of earlier segments come back). Summing these across segments
  double counts.
* `'terminal'`: not a count at all: a claim about the run as it
  stands at this settle, which a later segment can only replace.
