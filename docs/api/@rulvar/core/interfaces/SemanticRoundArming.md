[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SemanticRoundArming

# Interface: SemanticRoundArming

Defined in: [packages/core/src/orchestrator/admission.ts:326](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L326)

What the declared posture arms (RV4304): the one derivation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationroundarmed"></a> `citationRoundArmed` | `boolean` | The citation audit's bounded round. | [packages/core/src/orchestrator/admission.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L330) |
| <a id="property-citationroundrejudgesclaim"></a> `citationRoundRejudgesClaim` | `boolean` | The citation round rewrote the shipped document, so a configured claim pass past the draft rejudges it, ONE more claim pass; with the claim round ALSO armed the two are the same merged round and its own rejudge already counts, so this is false there (RV4202). | [packages/core/src/orchestrator/admission.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L339) |
| <a id="property-claimroundarmed"></a> `claimRoundArmed` | `boolean` | The claim pass's own bounded round ('repair', never at 'draft'). | [packages/core/src/orchestrator/admission.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L328) |
| <a id="property-roundarmed"></a> `roundArmed` | `boolean` | Any armed round: exactly one composition is bought either way (RV4202). | [packages/core/src/orchestrator/admission.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L332) |
