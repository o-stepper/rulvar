[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectAttemptDecision

# Interface: EffectAttemptDecision

Defined in: `packages/core/dist/index.d.ts`

One dispatch attempt, appended BEFORE the network send (RFC section
3.1, item 3): at most one attempt may be open at a time, and attempts
are sub-records of the ONE intent, never new intents.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_attempt"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-idempotencykey"></a> `idempotencyKey?` | `string` | The provider idempotency key, when the row carries one. | `packages/core/dist/index.d.ts` |
| <a id="property-intentref"></a> `intentRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-notafter"></a> `notAfter` | `string` | The attempt's send deadline (defense in depth, never proof). | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-ordinal"></a> `ordinal` | `number` | 1-based attempt order under the intent. | `packages/core/dist/index.d.ts` |
| <a id="property-transport"></a> `transport?` | `string` | - | `packages/core/dist/index.d.ts` |
