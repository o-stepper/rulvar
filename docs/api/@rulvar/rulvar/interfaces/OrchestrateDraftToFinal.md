[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateDraftToFinal

# Interface: OrchestrateDraftToFinal

Defined in: `packages/core/dist/index.d.ts`

How the shipped artifact relates to the draft the run composed it
from (RV2509), present on the acceptance envelope whenever a
synthesis was configured. Two hashes and the answer they imply: a
semantic verdict rendered over the draft describes the final only
when `rewritten` is false, and until this shipped a consumer had no
way to ask.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claimsjudgedon"></a> `claimsJudgedOn?` | `"draft"` \| `"final"` \| `"both"` | Which documents the claim-consistency pass actually judged; absent when it never ran. | `packages/core/dist/index.d.ts` |
| <a id="property-drafthash"></a> `draftHash` | `string` | sha256 over the canonical coordination draft. | `packages/core/dist/index.d.ts` |
| <a id="property-finalhash"></a> `finalHash` | `string` | sha256 over the canonical artifact the run settled on. | `packages/core/dist/index.d.ts` |
| <a id="property-rewritten"></a> `rewritten` | `boolean` | False exactly when the two hashes agree: the synthesis returned the draft unchanged. | `packages/core/dist/index.d.ts` |
