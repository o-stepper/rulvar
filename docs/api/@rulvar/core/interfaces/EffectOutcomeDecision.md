[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectOutcomeDecision

# Interface: EffectOutcomeDecision

Defined in: [packages/core/src/effects/types.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L182)

The classified result of one attempt.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attemptref"></a> `attemptRef` | `number` | - | [packages/core/src/effects/types.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L186) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_outcome"` | - | [packages/core/src/effects/types.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L183) |
| <a id="property-detail"></a> `detail?` | `string` | - | [packages/core/src/effects/types.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L193) |
| <a id="property-intentref"></a> `intentRef` | `number` | - | [packages/core/src/effects/types.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L185) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L184) |
| <a id="property-outcome"></a> `outcome` | `"accepted"` \| `"failed"` \| `"unknown"` | 'accepted': the provider took the request (receipt expected); 'failed': a classified failure that provably did not execute; 'unknown': unclassifiable from what the journal holds. | [packages/core/src/effects/types.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L192) |
