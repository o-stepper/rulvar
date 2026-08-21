[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SemanticRoundArming

# Interface: SemanticRoundArming

Defined in: `packages/core/dist/index.d.ts`

What the declared posture arms (RV4304): the one derivation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationroundarmed"></a> `citationRoundArmed` | `boolean` | The citation audit's bounded round. | `packages/core/dist/index.d.ts` |
| <a id="property-citationroundrejudgesclaim"></a> `citationRoundRejudgesClaim` | `boolean` | The citation round rewrote the shipped document, so a configured claim pass past the draft rejudges it, ONE more claim pass; with the claim round ALSO armed the two are the same merged round and its own rejudge already counts, so this is false there (RV4202). | `packages/core/dist/index.d.ts` |
| <a id="property-claimroundarmed"></a> `claimRoundArmed` | `boolean` | The claim pass's own bounded round ('repair', never at 'draft'). | `packages/core/dist/index.d.ts` |
| <a id="property-roundarmed"></a> `roundArmed` | `boolean` | Any armed round: exactly one composition is bought either way (RV4202). | `packages/core/dist/index.d.ts` |
