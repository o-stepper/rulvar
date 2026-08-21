[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AcceptanceTailSpec

# Interface: AcceptanceTailSpec

Defined in: `packages/core/dist/index.d.ts`

The declared inputs of the acceptance tail (RV4001); undeclared estimates are zero.

## Extends

- [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-citationjudgeestcostusd"></a> `citationJudgeEstCostUsd?` | `number` | The citation audit judge's declared estimate (RV4004), citationAudit.judge.estCost. The audit pays one pass, two under its own armed repair round, and that round also pays one more composition plus (when a claim pass is configured past the draft) one more claim rejudge; all of it enters the tail exactly like the claim terms, declared or zero. | - | `packages/core/dist/index.d.ts` |
| <a id="property-citationonfound"></a> `citationOnFound?` | `"report"` \| `"fail"` \| `"repair"` | Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`citationOnFound`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-citationonfound) | `packages/core/dist/index.d.ts` |
| <a id="property-claimconfigured"></a> `claimConfigured?` | `boolean` | True when a claim-consistency pass is declared. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`claimConfigured`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-claimconfigured) | `packages/core/dist/index.d.ts` |
| <a id="property-claimjudgeestcostusd"></a> `claimJudgeEstCostUsd?` | `number` | The claim judge's declared admission estimate, claimConsistency.judge.estCost. | - | `packages/core/dist/index.d.ts` |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"report"` \| `"carry"` \| `"fail"` \| `"repair"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`claimOnFound`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-claimonfound) | `packages/core/dist/index.d.ts` |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`claimStage`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-claimstage) | `packages/core/dist/index.d.ts` |
| <a id="property-finishestrepaircostusd"></a> `finishEstRepairCostUsd?` | `number` | The mechanical repair turn's declared price, finishValidation.estRepairCostUsd. | - | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisestcostusd"></a> `synthesisEstCostUsd?` | `number` | The declared price of one composition, synthesis.estCost. | - | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd?` | `number` | The held synthesis payload reserve, exactly budget.synthesisReserveUsd. | - | `packages/core/dist/index.d.ts` |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | One coordination turn floor: the resolved flat reserve of the run. | - | `packages/core/dist/index.d.ts` |
