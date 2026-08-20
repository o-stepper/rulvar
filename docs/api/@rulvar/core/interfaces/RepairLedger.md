[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RepairLedger

# Interface: RepairLedger

Defined in: [packages/core/src/stores/repair-ledger.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L90)

The workflow-wide repair aggregate (RV4002).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-composition"></a> `composition` | `number` | Granted mechanical repairs inside composition invocations, the round's own included. | [packages/core/src/stores/repair-ledger.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L94) |
| <a id="property-draft"></a> `draft` | `number` | Draft-gate rejections (each granted the loop's next attempt). | [packages/core/src/stores/repair-ledger.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L92) |
| <a id="property-rounds"></a> `rounds` | readonly [`RepairLedgerRound`](/api/@rulvar/core/interfaces/RepairLedgerRound.md)[] | One row per counted repair, in seq order. Semantic rounds carry their own rows since RV4105 (stage 'semantic', with the trigger when the journal stamped one), so their wires have a home and `semantic: 2` is decomposable without cross-reading metas. | [packages/core/src/stores/repair-ledger.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L105) |
| <a id="property-semantic"></a> `semantic` | `number` | Dispatched semantic repair rounds (RV3307). | [packages/core/src/stores/repair-ledger.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L96) |
| <a id="property-total"></a> `total` | `number` | draft + composition + semantic. | [packages/core/src/stores/repair-ledger.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L98) |
| <a id="property-unstagedverdicts"></a> `unstagedVerdicts` | `number` | Finish-validation 'repair' verdicts with no journaled stage: the journal predates RV4002, so the buckets above are a FLOOR, not the workflow answer. Zero on every journal this engine writes. | [packages/core/src/stores/repair-ledger.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/repair-ledger.ts#L111) |
