[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RepairLedger

# Interface: RepairLedger

Defined in: [packages/core/src/stores/repair-ledger.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L70)

The workflow-wide repair aggregate (RV4002).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-composition"></a> `composition` | `number` | Granted mechanical repairs inside composition invocations, the round's own included. | [packages/core/src/stores/repair-ledger.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L74) |
| <a id="property-draft"></a> `draft` | `number` | Draft-gate rejections (each granted the loop's next attempt). | [packages/core/src/stores/repair-ledger.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L72) |
| <a id="property-rounds"></a> `rounds` | readonly [`RepairLedgerRound`](/api/@rulvar/core/interfaces/RepairLedgerRound.md)[] | One row per counted repair, in seq order (semantic rounds carry no verdict row). | [packages/core/src/stores/repair-ledger.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L80) |
| <a id="property-semantic"></a> `semantic` | `number` | Dispatched semantic repair rounds (RV3307). | [packages/core/src/stores/repair-ledger.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L76) |
| <a id="property-total"></a> `total` | `number` | draft + composition + semantic. | [packages/core/src/stores/repair-ledger.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L78) |
| <a id="property-unstagedverdicts"></a> `unstagedVerdicts` | `number` | Finish-validation 'repair' verdicts with no journaled stage: the journal predates RV4002, so the buckets above are a FLOOR, not the workflow answer. Zero on every journal this engine writes. | [packages/core/src/stores/repair-ledger.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L86) |
