[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectAttemptState

# Interface: EffectAttemptState

Defined in: [packages/core/src/effects/fold.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L83)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-at"></a> `at` | `string` | The attempt entry's startedAt instant. | [packages/core/src/effects/fold.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L93) |
| <a id="property-idempotencykey"></a> `idempotencyKey?` | `string` | - | [packages/core/src/effects/fold.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L87) |
| <a id="property-notafter"></a> `notAfter` | `string` | - | [packages/core/src/effects/fold.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L86) |
| <a id="property-open"></a> `open` | `boolean` | - | [packages/core/src/effects/fold.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L89) |
| <a id="property-ordinal"></a> `ordinal` | `number` | - | [packages/core/src/effects/fold.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L85) |
| <a id="property-outcome"></a> `outcome?` | `"accepted"` \| `"failed"` \| `"unknown"` | - | [packages/core/src/effects/fold.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L90) |
| <a id="property-outcomeat"></a> `outcomeAt?` | `string` | The closing outcome entry's startedAt instant. | [packages/core/src/effects/fold.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L95) |
| <a id="property-outcomeseq"></a> `outcomeSeq?` | `number` | - | [packages/core/src/effects/fold.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L91) |
| <a id="property-seq"></a> `seq` | `number` | - | [packages/core/src/effects/fold.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L84) |
| <a id="property-transport"></a> `transport?` | `string` | - | [packages/core/src/effects/fold.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L88) |
