[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LedgerView

# Interface: LedgerView

Defined in: [packages/plan/src/ledger.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L90)

The pure ledger fold.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-brief"></a> `brief?` | \{ `entryRef`: `number`; `text`: `string`; \} | - | [packages/plan/src/ledger.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L91) |
| `brief.entryRef` | `number` | - | [packages/plan/src/ledger.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L91) |
| `brief.text` | `string` | - | [packages/plan/src/ledger.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L91) |
| <a id="property-discrepancies"></a> `discrepancies` | `string`[] | Journal-vs-ledger contradictions, flagged and never resolved here. | [packages/plan/src/ledger.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L102) |
| <a id="property-facts"></a> `facts` | [`LedgerFact`](/api/@rulvar/plan/interfaces/LedgerFact.md)[] | - | [packages/plan/src/ledger.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L92) |
| <a id="property-lessons"></a> `lessons` | [`LedgerLesson`](/api/@rulvar/plan/interfaces/LedgerLesson.md)[] | - | [packages/plan/src/ledger.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L93) |
| <a id="property-observations"></a> `observations` | [`LedgerObservation`](/api/@rulvar/plan/interfaces/LedgerObservation.md)[] | - | [packages/plan/src/ledger.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L94) |
| <a id="property-revisionhistory"></a> `revisionHistory` | [`LedgerRevisionRow`](/api/@rulvar/plan/interfaces/LedgerRevisionRow.md)[] | Auto-derived: plan revision history with rationale. | [packages/plan/src/ledger.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L96) |
| <a id="property-taskdigests"></a> `taskDigests` | \{ `entryRef`: `number`; `nodeId?`: `string`; `scope`: `string`; `status`: `string`; \}[] | Auto-derived: task digests ordered by spawn ordinal (root seq). | [packages/plan/src/ledger.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L98) |
| <a id="property-worlddelta"></a> `worldDelta` | \{ `artifacts`: `number`; `entryRef`: `number`; `scope`: `string`; \}[] | Auto-derived: the world-delta index from terminal artifacts. | [packages/plan/src/ledger.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L100) |
