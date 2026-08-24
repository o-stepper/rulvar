[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectDispositionDecision

# Interface: EffectDispositionDecision

Defined in: [packages/core/src/effects/types.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L288)

A journaled human disposition of a quarantine or an incident.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-causalref"></a> `causalRef?` | `number` | The incident this disposition answers, when not the quarantine. | [packages/core/src/effects/types.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L296) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_disposition"` | - | [packages/core/src/effects/types.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L289) |
| <a id="property-disposition"></a> `disposition` | `string` | - | [packages/core/src/effects/types.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L294) |
| <a id="property-intentref"></a> `intentRef` | `number` | - | [packages/core/src/effects/types.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L291) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L290) |
| <a id="property-principal"></a> `principal` | `string` | - | [packages/core/src/effects/types.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L292) |
| <a id="property-reason"></a> `reason` | `string` | - | [packages/core/src/effects/types.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L293) |
