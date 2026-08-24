[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectProbeDecision

# Interface: EffectProbeDecision

Defined in: [packages/core/src/effects/types.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L262)

A journaled provider probe (plan 45 train five): every lookup and
every acceptance closure the recovery machinery performs is a
durable row, so the intent's lookup budget (RFC section 3.1) is
countable from the journal alone and survives a crash of the
probing process.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptanceclosed"></a> `acceptanceClosed?` | `boolean` | True when the negative is provider-enforced final. | [packages/core/src/effects/types.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L269) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_probe"` | - | [packages/core/src/effects/types.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L263) |
| <a id="property-found"></a> `found` | `boolean` | - | [packages/core/src/effects/types.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L267) |
| <a id="property-intentref"></a> `intentRef` | `number` | - | [packages/core/src/effects/types.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L265) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L264) |
| <a id="property-probe"></a> `probe` | `"lookup"` \| `"close-acceptance"` | - | [packages/core/src/effects/types.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L266) |
