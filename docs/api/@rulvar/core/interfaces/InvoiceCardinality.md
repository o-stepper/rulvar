[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceCardinality

# Interface: InvoiceCardinality

Defined in: [packages/core/src/engine/invoice.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L201)

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
| <a id="property-dispatchrows"></a> `dispatchRows` | `number` | Rows folding a real provider call; unattributed remainders excluded. | [packages/core/src/engine/invoice.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L203) |
| <a id="property-multiwirerows"></a> `multiWireRows` | `number` | Rows whose dispatch absorbed more than one wire request. | [packages/core/src/engine/invoice.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L207) |
| <a id="property-wireidsmissing"></a> `wireIdsMissing` | `number` | Wire requests with no recorded join key, across EVERY dispatch row (RV1410): a multi-wire row contributes the requests its id set left unnamed, and a single-wire row contributes its one request when neither `responseId` nor an id set names it. Failed requests count like any other: the provider may have billed them, and a statement line cannot be joined to a row that has no id either way. | [packages/core/src/engine/invoice.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L217) |
| <a id="property-wirerequests"></a> `wireRequests` | `number` | Provider HTTP requests those rows represent, absorbed continuations counted. | [packages/core/src/engine/invoice.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L205) |
