[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LedgerExport

# Interface: LedgerExport

Defined in: [packages/plan/src/ledger.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L327)

The draft-versioned outward seam (docs/07, 9.3; OQ in docs/14).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-brief"></a> `brief?` | `string` | [packages/plan/src/ledger.ts:329](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L329) |
| <a id="property-facts"></a> `facts` | `Omit`\&lt;[`LedgerFact`](/api/@rulvar/plan/interfaces/LedgerFact.md), `"entryRef"`\&gt;[] | [packages/plan/src/ledger.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L330) |
| <a id="property-ledgerexportversion"></a> `ledgerExportVersion` | `"draft-1"` | [packages/plan/src/ledger.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L328) |
| <a id="property-lessons"></a> `lessons` | `Omit`\&lt;[`LedgerLesson`](/api/@rulvar/plan/interfaces/LedgerLesson.md), `"entryRef"`\&gt;[] | [packages/plan/src/ledger.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L331) |
| <a id="property-observations"></a> `observations` | `Omit`\&lt;[`LedgerObservation`](/api/@rulvar/plan/interfaces/LedgerObservation.md), `"entryRef"`\&gt;[] | [packages/plan/src/ledger.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L332) |
| <a id="property-revisionhistory"></a> `revisionHistory` | [`LedgerRevisionRow`](/api/@rulvar/plan/interfaces/LedgerRevisionRow.md)[] | [packages/plan/src/ledger.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L333) |
