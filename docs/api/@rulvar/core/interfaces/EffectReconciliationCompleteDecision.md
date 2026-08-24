[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectReconciliationCompleteDecision

# Interface: EffectReconciliationCompleteDecision

Defined in: [packages/core/src/effects/types.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L279)

The post-restore gate release (RFC section 4.5, item 3): after a
restoration epoch's reconciliation sweep completes, this decision
re-enables attempt dispatch for that epoch. An epoch born from a
restore (its recorded restoration generation differs from its
predecessor's) refuses to open attempts until this row exists.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_reconciliation_complete"` | - | [packages/core/src/effects/types.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L280) |
| <a id="property-epochref"></a> `epochRef` | `number` | Seq of the effect_epoch this completion releases. | [packages/core/src/effects/types.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L283) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L281) |
| <a id="property-swept"></a> `swept` | `number` | - | [packages/core/src/effects/types.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L284) |
