[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LedgerView

# Interface: LedgerView

Defined in: [packages/plan/src/ledger.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L111)

The pure ledger fold.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-brief"></a> `brief?` | \{ `entryRef`: `number`; `text`: `string`; \} | - | [packages/plan/src/ledger.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L112) |
| `brief.entryRef` | `number` | - | [packages/plan/src/ledger.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L112) |
| `brief.text` | `string` | - | [packages/plan/src/ledger.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L112) |
| <a id="property-discrepancies"></a> `discrepancies` | `string`[] | Journal-vs-ledger contradictions, flagged and never resolved here. | [packages/plan/src/ledger.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L123) |
| <a id="property-facts"></a> `facts` | [`LedgerFact`](/api/@rulvar/plan/interfaces/LedgerFact.md)[] | - | [packages/plan/src/ledger.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L113) |
| <a id="property-lessons"></a> `lessons` | [`LedgerLesson`](/api/@rulvar/plan/interfaces/LedgerLesson.md)[] | - | [packages/plan/src/ledger.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L114) |
| <a id="property-observations"></a> `observations` | [`LedgerObservation`](/api/@rulvar/plan/interfaces/LedgerObservation.md)[] | - | [packages/plan/src/ledger.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L115) |
| <a id="property-revisionhistory"></a> `revisionHistory` | [`LedgerRevisionRow`](/api/@rulvar/plan/interfaces/LedgerRevisionRow.md)[] | Auto-derived: plan revision history with rationale. | [packages/plan/src/ledger.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L117) |
| <a id="property-taskdigests"></a> `taskDigests` | \{ `entryRef`: `number`; `nodeId?`: `string`; `scope`: `string`; `status`: `string`; \}[] | Auto-derived: task digests ordered by spawn ordinal (root seq). | [packages/plan/src/ledger.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L119) |
| <a id="property-worlddelta"></a> `worldDelta` | \{ `artifacts`: `number`; `entryRef`: `number`; `scope`: `string`; \}[] | Auto-derived: the world-delta index from terminal artifacts. | [packages/plan/src/ledger.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L121) |
