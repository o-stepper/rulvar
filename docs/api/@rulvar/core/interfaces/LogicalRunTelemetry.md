[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LogicalRunTelemetry

# Interface: LogicalRunTelemetry

Defined in: [packages/core/src/stores/reconcile.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L343)

One logical run's telemetry, folded across every segment (RV2510).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entries"></a> `entries` | `number` | Entries the run holds in total. Equal to the sum of `entriesPerSegment` plus whatever follows the last settle: the partition is exact BECAUSE it is a partition, which is what makes this figure safe to read beside a cumulative one. | [packages/core/src/stores/reconcile.ts:361](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L361) |
| <a id="property-entriesafterlastsettle"></a> `entriesAfterLastSettle` | `number` | Entries appended AFTER the last settle. Nonzero means the journal continued past its terminal (RV1407: a detached resolution awaiting its resume, or a successor segment over a stale settle), so the last status is not the run's last word. | [packages/core/src/stores/reconcile.ts:368](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L368) |
| <a id="property-entriespersegment"></a> `entriesPerSegment` | `number`[] | Journal entries each segment APPENDED, in the same order: its own share of the run's durable work, which is the one honest per-segment measure of effort a resumed run has. A pure-replay segment that appended nothing but its settle reads 1. | [packages/core/src/stores/reconcile.ts:354](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L354) |
| <a id="property-segments"></a> `segments` | `number` | How many settles the journal records: the number of segments that ran. | [packages/core/src/stores/reconcile.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L345) |
| <a id="property-statuses"></a> `statuses` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md)[] | Each segment's settled status, in journal order. | [packages/core/src/stores/reconcile.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L347) |
