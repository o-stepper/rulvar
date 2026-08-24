[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectOutcomeDecision

# Interface: EffectOutcomeDecision

Defined in: `packages/core/dist/index.d.ts`

The classified result of one attempt.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attemptref"></a> `attemptRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_outcome"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-detail"></a> `detail?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-intentref"></a> `intentRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-outcome"></a> `outcome` | `"accepted"` \| `"unknown"` \| `"failed"` | 'accepted': the provider took the request (receipt expected); 'failed': a classified failure that provably did not execute; 'unknown': unclassifiable from what the journal holds. | `packages/core/dist/index.d.ts` |
