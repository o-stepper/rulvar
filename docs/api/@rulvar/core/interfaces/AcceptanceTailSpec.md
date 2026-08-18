[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceTailSpec

# Interface: AcceptanceTailSpec

Defined in: [packages/core/src/orchestrator/admission.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L310)

The declared inputs of the acceptance tail (RV4001); undeclared estimates are zero.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claimjudgeestcostusd"></a> `claimJudgeEstCostUsd?` | `number` | The claim judge's declared admission estimate, claimConsistency.judge.estCost. | [packages/core/src/orchestrator/admission.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L318) |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"repair"` \| `"report"` \| `"carry"` \| `"fail"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | [packages/core/src/orchestrator/admission.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L316) |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | [packages/core/src/orchestrator/admission.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L314) |
| <a id="property-finishestrepaircostusd"></a> `finishEstRepairCostUsd?` | `number` | The mechanical repair turn's declared price, finishValidation.estRepairCostUsd. | [packages/core/src/orchestrator/admission.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L320) |
| <a id="property-synthesisestcostusd"></a> `synthesisEstCostUsd?` | `number` | The declared price of one composition, synthesis.estCost. | [packages/core/src/orchestrator/admission.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L322) |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd?` | `number` | The held synthesis payload reserve, exactly budget.synthesisReserveUsd. | [packages/core/src/orchestrator/admission.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L312) |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | One coordination turn floor: the resolved flat reserve of the run. | [packages/core/src/orchestrator/admission.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L324) |
