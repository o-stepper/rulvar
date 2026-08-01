[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InvoiceCardinality

# Interface: InvoiceCardinality

Defined in: `packages/core/dist/index.d.ts`

Logical dispatches against provider HTTP requests (RV1210). One row
is one DISPATCH, and a dispatch that absorbed provider-side
continuations (RV905) is billed by the provider as several requests,
so a per-request statement has MORE lines than this export has rows
BY CONSTRUCTION. The counters state that difference instead of
leaving a host to meet it as an unexplained count mismatch: a
reconciliation that compares row count against statement line count
should compare `wireRequests`, and `wireIdsMissing` says how many of
those requests carry no join key at all.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dispatchrows"></a> `dispatchRows` | `number` | Rows folding a real provider call; unattributed remainders excluded. | `packages/core/dist/index.d.ts` |
| <a id="property-multiwirerows"></a> `multiWireRows` | `number` | Rows whose dispatch absorbed more than one wire request. | `packages/core/dist/index.d.ts` |
| <a id="property-wireidsmissing"></a> `wireIdsMissing` | `number` | Wire requests inside those rows for which no response id was recorded. | `packages/core/dist/index.d.ts` |
| <a id="property-wirerequests"></a> `wireRequests` | `number` | Provider HTTP requests those rows represent, absorbed continuations counted. | `packages/core/dist/index.d.ts` |
