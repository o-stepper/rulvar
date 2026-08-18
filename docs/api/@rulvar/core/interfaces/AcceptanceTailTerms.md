[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceTailTerms

# Interface: AcceptanceTailTerms

Defined in: [packages/core/src/orchestrator/admission.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L328)

The resolved terms behind [acceptanceTailRequiredUsd](/api/@rulvar/core/functions/acceptanceTailRequiredUsd.md); journal-ready numbers.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-estrepaircostusd"></a> `estRepairCostUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L333) |
| <a id="property-judgeestusd"></a> `judgeEstUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L330) |
| <a id="property-judgepasses"></a> `judgePasses` | `number` | Worst-case judge dispatches: ('both' ? 2 : 1) plus one under an armed repair round. | [packages/core/src/orchestrator/admission.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L332) |
| <a id="property-roundcompositionusd"></a> `roundCompositionUsd` | `number` | One more composition when the repair round is armed, priced at synthesis.estCost. | [packages/core/src/orchestrator/admission.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L335) |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:329](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L329) |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L336) |
