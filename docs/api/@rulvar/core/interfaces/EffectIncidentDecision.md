[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectIncidentDecision

# Interface: EffectIncidentDecision

Defined in: [packages/core/src/effects/types.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L246)

A linked incident (RFC section 4.6, item 2): a fact that arrived
after a terminal and genuinely matters. Durable, causally linked,
surfaced, requiring disposition; never a mutation of the terminal.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-causalref"></a> `causalRef?` | `number` | [packages/core/src/effects/types.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L251) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_incident"` | [packages/core/src/effects/types.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L247) |
| <a id="property-detail"></a> `detail?` | `string` | [packages/core/src/effects/types.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L252) |
| <a id="property-incident"></a> `incident` | `string` | [packages/core/src/effects/types.ts:250](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L250) |
| <a id="property-intentref"></a> `intentRef` | `number` | [packages/core/src/effects/types.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L249) |
| <a id="property-opid"></a> `opId` | `string` | [packages/core/src/effects/types.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L248) |
