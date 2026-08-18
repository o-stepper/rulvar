[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceTailSpec

# Interface: AcceptanceTailSpec

Defined in: [packages/core/src/orchestrator/admission.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L310)

The declared inputs of the acceptance tail (RV4001); undeclared estimates are zero.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationjudgeestcostusd"></a> `citationJudgeEstCostUsd?` | `number` | The citation audit judge's declared estimate (RV4004), citationAudit.judge.estCost. The audit pays one pass, two under its own armed repair round, and that round also pays one more composition plus (when a claim pass is configured past the draft) one more claim rejudge; all of it enters the tail exactly like the claim terms, declared or zero. | [packages/core/src/orchestrator/admission.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L331) |
| <a id="property-citationonfound"></a> `citationOnFound?` | `"repair"` \| `"report"` \| `"fail"` | Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. | [packages/core/src/orchestrator/admission.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L333) |
| <a id="property-claimconfigured"></a> `claimConfigured?` | `boolean` | True when a claim-consistency pass is declared (its rejudge after a citation round is priced). | [packages/core/src/orchestrator/admission.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L335) |
| <a id="property-claimjudgeestcostusd"></a> `claimJudgeEstCostUsd?` | `number` | The claim judge's declared admission estimate, claimConsistency.judge.estCost. | [packages/core/src/orchestrator/admission.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L318) |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"repair"` \| `"report"` \| `"carry"` \| `"fail"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | [packages/core/src/orchestrator/admission.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L316) |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | [packages/core/src/orchestrator/admission.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L314) |
| <a id="property-finishestrepaircostusd"></a> `finishEstRepairCostUsd?` | `number` | The mechanical repair turn's declared price, finishValidation.estRepairCostUsd. | [packages/core/src/orchestrator/admission.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L320) |
| <a id="property-synthesisestcostusd"></a> `synthesisEstCostUsd?` | `number` | The declared price of one composition, synthesis.estCost. | [packages/core/src/orchestrator/admission.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L322) |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd?` | `number` | The held synthesis payload reserve, exactly budget.synthesisReserveUsd. | [packages/core/src/orchestrator/admission.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L312) |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | One coordination turn floor: the resolved flat reserve of the run. | [packages/core/src/orchestrator/admission.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L337) |
