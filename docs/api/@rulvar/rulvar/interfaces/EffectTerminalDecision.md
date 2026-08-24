[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectTerminalDecision

# Interface: EffectTerminalDecision

Defined in: `packages/core/dist/index.d.ts`

A terminal transition (RFC section 4.6): the first terminal append
for an intent closes it; later would-be transitions fold as durable
no-ops with a superseded-by reason. A terminal without `intentRef`
is a standalone `refused` record (the writer's durable give-up when
no intent ever landed); it requires `logicalKey`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-causalref"></a> `causalRef?` | `number` | Causal reference (for 'compensated': the compensation intent). | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_terminal"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-intentref"></a> `intentRef?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-logicalkey"></a> `logicalKey?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reason"></a> `reason?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-terminal"></a> `terminal` | [`EffectTerminalState`](/api/@rulvar/rulvar/type-aliases/EffectTerminalState.md) | - | `packages/core/dist/index.d.ts` |
