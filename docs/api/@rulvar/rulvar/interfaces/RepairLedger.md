[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RepairLedger

# Interface: RepairLedger

Defined in: `packages/core/dist/index.d.ts`

The workflow-wide repair aggregate (RV4002).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-composition"></a> `composition` | `number` | Granted mechanical repairs inside composition invocations, the round's own included. | `packages/core/dist/index.d.ts` |
| <a id="property-draft"></a> `draft` | `number` | Draft-gate rejections (each granted the loop's next attempt). | `packages/core/dist/index.d.ts` |
| <a id="property-rounds"></a> `rounds` | readonly [`RepairLedgerRound`](/api/@rulvar/rulvar/interfaces/RepairLedgerRound.md)[] | One row per counted repair, in seq order (semantic rounds carry no verdict row). | `packages/core/dist/index.d.ts` |
| <a id="property-semantic"></a> `semantic` | `number` | Dispatched semantic repair rounds (RV3307). | `packages/core/dist/index.d.ts` |
| <a id="property-total"></a> `total` | `number` | draft + composition + semantic. | `packages/core/dist/index.d.ts` |
| <a id="property-unstagedverdicts"></a> `unstagedVerdicts` | `number` | Finish-validation 'repair' verdicts with no journaled stage: the journal predates RV4002, so the buckets above are a FLOOR, not the workflow answer. Zero on every journal this engine writes. | `packages/core/dist/index.d.ts` |
