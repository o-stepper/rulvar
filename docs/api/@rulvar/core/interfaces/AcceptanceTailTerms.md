[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceTailTerms

# Interface: AcceptanceTailTerms

Defined in: [packages/core/src/orchestrator/admission.ts:392](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L392)

The resolved terms behind [acceptanceTailRequiredUsd](/api/@rulvar/core/functions/acceptanceTailRequiredUsd.md); journal-ready numbers.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationjudgeestusd"></a> `citationJudgeEstUsd?` | `number` | The citation audit judge terms (RV4004), present in the sum only when the audit is declared: `citationJudgePasses` is 1, 2 under the audit's own armed round (which also arms the composition term above and, with a claim pass configured past the draft, one more claim rejudge inside `judgePasses`). | [packages/core/src/orchestrator/admission.ts:407](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L407) |
| <a id="property-citationjudgepasses"></a> `citationJudgePasses?` | `number` | - | [packages/core/src/orchestrator/admission.ts:408](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L408) |
| <a id="property-estrepaircostusd"></a> `estRepairCostUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:397](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L397) |
| <a id="property-judgeestusd"></a> `judgeEstUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:394](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L394) |
| <a id="property-judgepasses"></a> `judgePasses` | `number` | Worst-case judge dispatches: ('both' ? 2 : 1) plus one under an armed repair round. | [packages/core/src/orchestrator/admission.ts:396](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L396) |
| <a id="property-roundcompositionusd"></a> `roundCompositionUsd` | `number` | One more composition when the repair round is armed, priced at synthesis.estCost. | [packages/core/src/orchestrator/admission.ts:399](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L399) |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:393](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L393) |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:409](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L409) |
