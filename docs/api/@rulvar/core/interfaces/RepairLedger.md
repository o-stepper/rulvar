[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RepairLedger

# Interface: RepairLedger

Defined in: [packages/core/src/stores/repair-ledger.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L87)

The workflow-wide repair aggregate (RV4002).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-composition"></a> `composition` | `number` | Granted mechanical repairs inside composition invocations, the round's own included. | [packages/core/src/stores/repair-ledger.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L91) |
| <a id="property-draft"></a> `draft` | `number` | Draft-gate rejections (each granted the loop's next attempt). | [packages/core/src/stores/repair-ledger.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L89) |
| <a id="property-rounds"></a> `rounds` | readonly [`RepairLedgerRound`](/api/@rulvar/core/interfaces/RepairLedgerRound.md)[] | One row per counted repair, in seq order. Semantic rounds carry their own rows since RV4105 (stage 'semantic', with the trigger when the journal stamped one), so their wires have a home and `semantic: 2` is decomposable without cross-reading metas. | [packages/core/src/stores/repair-ledger.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L102) |
| <a id="property-semantic"></a> `semantic` | `number` | Dispatched semantic repair rounds (RV3307). | [packages/core/src/stores/repair-ledger.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L93) |
| <a id="property-total"></a> `total` | `number` | draft + composition + semantic. | [packages/core/src/stores/repair-ledger.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L95) |
| <a id="property-unstagedverdicts"></a> `unstagedVerdicts` | `number` | Finish-validation 'repair' verdicts with no journaled stage: the journal predates RV4002, so the buckets above are a FLOOR, not the workflow answer. Zero on every journal this engine writes. | [packages/core/src/stores/repair-ledger.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L108) |
