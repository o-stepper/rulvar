[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LedgerObservation

# Interface: LedgerObservation

Defined in: [packages/plan/src/ledger.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L88)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef` | `number` | - | [packages/plan/src/ledger.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L99) |
| <a id="property-evidencerefs"></a> `evidenceRefs` | `number`[] | - | [packages/plan/src/ledger.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L94) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/plan/src/ledger.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L90) |
| <a id="property-note"></a> `note` | `string` | - | [packages/plan/src/ledger.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L93) |
| <a id="property-outcomeclass"></a> `outcomeClass?` | `string` | - | [packages/plan/src/ledger.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L92) |
| <a id="property-polarity"></a> `polarity?` | `"strength"` \| `"weakness"` | - | [packages/plan/src/ledger.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L97) |
| <a id="property-subject"></a> `subject?` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `string`; \} | Present exactly on kb_propose-born observations (phase 3). | [packages/plan/src/ledger.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L96) |
| `subject.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/plan/src/ledger.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L96) |
| `subject.model` | `string` | - | [packages/plan/src/ledger.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L96) |
| <a id="property-taskclass"></a> `taskClass` | `string` | - | [packages/plan/src/ledger.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L89) |
| <a id="property-tierobserved"></a> `tierObserved?` | `number` | - | [packages/plan/src/ledger.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L91) |
| <a id="property-trigger"></a> `trigger?` | [`KbProposalTrigger`](/api/@rulvar/rulvar/type-aliases/KbProposalTrigger.md) | - | [packages/plan/src/ledger.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L98) |
