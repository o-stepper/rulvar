[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectAttemptDecision

# Interface: EffectAttemptDecision

Defined in: [packages/core/src/effects/types.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L172)

One dispatch attempt, appended BEFORE the network send (RFC section
3.1, item 3): at most one attempt may be open at a time, and attempts
are sub-records of the ONE intent, never new intents.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_attempt"` | - | [packages/core/src/effects/types.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L173) |
| <a id="property-idempotencykey"></a> `idempotencyKey?` | `string` | The provider idempotency key, when the row carries one. | [packages/core/src/effects/types.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L181) |
| <a id="property-intentref"></a> `intentRef` | `number` | - | [packages/core/src/effects/types.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L175) |
| <a id="property-notafter"></a> `notAfter` | `string` | The attempt's send deadline (defense in depth, never proof). | [packages/core/src/effects/types.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L179) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L174) |
| <a id="property-ordinal"></a> `ordinal` | `number` | 1-based attempt order under the intent. | [packages/core/src/effects/types.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L177) |
| <a id="property-transport"></a> `transport?` | `string` | - | [packages/core/src/effects/types.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L182) |
