[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceTailSpec

# Interface: AcceptanceTailSpec

Defined in: [packages/core/src/orchestrator/admission.ts:369](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L369)

The declared inputs of the acceptance tail (RV4001); undeclared estimates are zero.

## Extends

- [`SemanticRoundPosture`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-citationjudgeestcostusd"></a> `citationJudgeEstCostUsd?` | `number` | The citation audit judge's declared estimate (RV4004), citationAudit.judge.estCost. The audit pays one pass, two under its own armed repair round, and that round also pays one more composition plus (when a claim pass is configured past the draft) one more claim rejudge; all of it enters the tail exactly like the claim terms, declared or zero. | - | [packages/core/src/orchestrator/admission.ts:386](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L386) |
| <a id="property-citationonfound"></a> `citationOnFound?` | `"repair"` \| `"report"` \| `"fail"` | Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. | [`SemanticRoundPosture`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md).[`citationOnFound`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md#property-citationonfound) | [packages/core/src/orchestrator/admission.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L321) |
| <a id="property-claimconfigured"></a> `claimConfigured?` | `boolean` | True when a claim-consistency pass is declared. | [`SemanticRoundPosture`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md).[`claimConfigured`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md#property-claimconfigured) | [packages/core/src/orchestrator/admission.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L323) |
| <a id="property-claimjudgeestcostusd"></a> `claimJudgeEstCostUsd?` | `number` | The claim judge's declared admission estimate, claimConsistency.judge.estCost. | - | [packages/core/src/orchestrator/admission.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L373) |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"repair"` \| `"report"` \| `"carry"` \| `"fail"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | [`SemanticRoundPosture`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md).[`claimOnFound`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md#property-claimonfound) | [packages/core/src/orchestrator/admission.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L319) |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | [`SemanticRoundPosture`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md).[`claimStage`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md#property-claimstage) | [packages/core/src/orchestrator/admission.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L317) |
| <a id="property-finishestrepaircostusd"></a> `finishEstRepairCostUsd?` | `number` | The mechanical repair turn's declared price, finishValidation.estRepairCostUsd. | - | [packages/core/src/orchestrator/admission.ts:375](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L375) |
| <a id="property-synthesisestcostusd"></a> `synthesisEstCostUsd?` | `number` | The declared price of one composition, synthesis.estCost. | - | [packages/core/src/orchestrator/admission.ts:377](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L377) |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd?` | `number` | The held synthesis payload reserve, exactly budget.synthesisReserveUsd. | - | [packages/core/src/orchestrator/admission.ts:371](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L371) |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | One coordination turn floor: the resolved flat reserve of the run. | - | [packages/core/src/orchestrator/admission.ts:388](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L388) |
