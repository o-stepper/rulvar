[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AcceptanceTailSpec

# Interface: AcceptanceTailSpec

Defined in: `packages/core/dist/index.d.ts`

The declared inputs of the acceptance tail (RV4001); undeclared estimates are zero.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claimjudgeestcostusd"></a> `claimJudgeEstCostUsd?` | `number` | The claim judge's declared admission estimate, claimConsistency.judge.estCost. | `packages/core/dist/index.d.ts` |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"report"` \| `"carry"` \| `"fail"` \| `"repair"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | `packages/core/dist/index.d.ts` |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | `packages/core/dist/index.d.ts` |
| <a id="property-finishestrepaircostusd"></a> `finishEstRepairCostUsd?` | `number` | The mechanical repair turn's declared price, finishValidation.estRepairCostUsd. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisestcostusd"></a> `synthesisEstCostUsd?` | `number` | The declared price of one composition, synthesis.estCost. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd?` | `number` | The held synthesis payload reserve, exactly budget.synthesisReserveUsd. | `packages/core/dist/index.d.ts` |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | One coordination turn floor: the resolved flat reserve of the run. | `packages/core/dist/index.d.ts` |
