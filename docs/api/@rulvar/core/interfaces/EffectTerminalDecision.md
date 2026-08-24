[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectTerminalDecision

# Interface: EffectTerminalDecision

Defined in: [packages/core/src/effects/types.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L226)

A terminal transition (RFC section 4.6): the first terminal append
for an intent closes it; later would-be transitions fold as durable
no-ops with a superseded-by reason. A terminal without `intentRef`
is a standalone `refused` record (the writer's durable give-up when
no intent ever landed); it requires `logicalKey`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-causalref"></a> `causalRef?` | `number` | Causal reference (for 'compensated': the compensation intent). | [packages/core/src/effects/types.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L234) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_terminal"` | - | [packages/core/src/effects/types.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L227) |
| <a id="property-intentref"></a> `intentRef?` | `number` | - | [packages/core/src/effects/types.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L229) |
| <a id="property-logicalkey"></a> `logicalKey?` | `string` | - | [packages/core/src/effects/types.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L230) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L228) |
| <a id="property-reason"></a> `reason?` | `string` | - | [packages/core/src/effects/types.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L232) |
| <a id="property-terminal"></a> `terminal` | [`EffectTerminalState`](/api/@rulvar/core/type-aliases/EffectTerminalState.md) | - | [packages/core/src/effects/types.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L231) |
