[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / LogicalRunTelemetry

# Interface: LogicalRunTelemetry

Defined in: `packages/core/dist/index.d.ts`

One logical run's telemetry, folded across every segment (RV2510).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-activems"></a> `activeMs?` | `number` | The two time conventions of a resumed run (RV4409, the seventh comparison experiment's post-mortem measured them by external script): `activeMs` sums each segment's own append window (its first to its last appended entry), `calendarMs` spans the whole journal, and `gapMs` is their difference, the operator time between segments. Derived from the `startedAt` stamps the entries already carry; absent when the journal carries none (absence means NOT RECORDED, RV1209). | `packages/core/dist/index.d.ts` |
| <a id="property-calendarms"></a> `calendarMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-entries"></a> `entries` | `number` | Entries the run holds in total. Equal to the sum of `entriesPerSegment` plus whatever follows the last settle: the partition is exact BECAUSE it is a partition, which is what makes this figure safe to read beside a cumulative one. | `packages/core/dist/index.d.ts` |
| <a id="property-entriesafterlastsettle"></a> `entriesAfterLastSettle` | `number` | Entries appended AFTER the last settle. Nonzero means the journal continued past its terminal (RV1407: a detached resolution awaiting its resume, or a successor segment over a stale settle), so the last status is not the run's last word. | `packages/core/dist/index.d.ts` |
| <a id="property-entriespersegment"></a> `entriesPerSegment` | `number`[] | Journal entries each segment APPENDED, in the same order: its own share of the run's durable work, which is the one honest per-segment measure of effort a resumed run has. A pure-replay segment that appended nothing but its settle reads 1. | `packages/core/dist/index.d.ts` |
| <a id="property-gapms"></a> `gapMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-logicalwirerequests"></a> `logicalWireRequests?` | `number` | Provider wire decisions across the WHOLE journal (RV4409): the logical run's paid wire count, the invoice's cardinality. A resumed segment re-reads its prefix without re-paying it, so this figure and a segment's own adapter fetches are DIFFERENT counters with different names; the seventh comparison experiment reconciled "16 versus 109" by hand for exactly this reason. | `packages/core/dist/index.d.ts` |
| <a id="property-persegment"></a> `perSegment?` | \{ `activeMs?`: `number`; `entries`: `number`; `replayed?`: `true`; `status`: [`RunStatus`](/api/@rulvar/rulvar/type-aliases/RunStatus.md); \}[] | Per segment, in journal order (RV4409): the settled status, the appended entries, the segment's own append window when the stamps exist, and `replayed: true` on a pure-replay segment (nothing appended but its settle), so a resumed run's walls read as the original segments' work instead of 0.0 s. | `packages/core/dist/index.d.ts` |
| <a id="property-segments"></a> `segments` | `number` | How many settles the journal records: the number of segments that ran. | `packages/core/dist/index.d.ts` |
| <a id="property-statuses"></a> `statuses` | [`RunStatus`](/api/@rulvar/rulvar/type-aliases/RunStatus.md)[] | Each segment's settled status, in journal order. | `packages/core/dist/index.d.ts` |
