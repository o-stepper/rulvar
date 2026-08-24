[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectDispositionDecision

# Interface: EffectDispositionDecision

Defined in: [packages/core/src/effects/types.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L252)

A journaled human disposition of a quarantine or an incident.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-causalref"></a> `causalRef?` | `number` | The incident this disposition answers, when not the quarantine. | [packages/core/src/effects/types.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L260) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_disposition"` | - | [packages/core/src/effects/types.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L253) |
| <a id="property-disposition"></a> `disposition` | `string` | - | [packages/core/src/effects/types.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L258) |
| <a id="property-intentref"></a> `intentRef` | `number` | - | [packages/core/src/effects/types.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L255) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L254) |
| <a id="property-principal"></a> `principal` | `string` | - | [packages/core/src/effects/types.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L256) |
| <a id="property-reason"></a> `reason` | `string` | - | [packages/core/src/effects/types.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L257) |
