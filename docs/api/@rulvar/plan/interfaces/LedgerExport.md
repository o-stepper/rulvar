[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LedgerExport

# Interface: LedgerExport

Defined in: [packages/plan/src/ledger.ts:350](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L350)

The draft-versioned outward seam; the final shape stays an open question.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-brief"></a> `brief?` | `string` | [packages/plan/src/ledger.ts:352](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L352) |
| <a id="property-facts"></a> `facts` | `Omit`\&lt;[`LedgerFact`](/api/@rulvar/plan/interfaces/LedgerFact.md), `"entryRef"`\&gt;[] | [packages/plan/src/ledger.ts:353](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L353) |
| <a id="property-ledgerexportversion"></a> `ledgerExportVersion` | `"draft-1"` | [packages/plan/src/ledger.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L351) |
| <a id="property-lessons"></a> `lessons` | `Omit`\&lt;[`LedgerLesson`](/api/@rulvar/plan/interfaces/LedgerLesson.md), `"entryRef"`\&gt;[] | [packages/plan/src/ledger.ts:354](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L354) |
| <a id="property-observations"></a> `observations` | `Omit`\&lt;[`LedgerObservation`](/api/@rulvar/plan/interfaces/LedgerObservation.md), `"entryRef"`\&gt;[] | [packages/plan/src/ledger.ts:355](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L355) |
| <a id="property-revisionhistory"></a> `revisionHistory` | [`LedgerRevisionRow`](/api/@rulvar/plan/interfaces/LedgerRevisionRow.md)[] | [packages/plan/src/ledger.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L356) |
