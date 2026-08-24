[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectReconciliationCompleteDecision

# Interface: EffectReconciliationCompleteDecision

Defined in: `packages/core/dist/index.d.ts`

The post-restore gate release (RFC section 4.5, item 3): after a
restoration epoch's reconciliation sweep completes, this decision
re-enables attempt dispatch for that epoch. An epoch born from a
restore (its recorded restoration generation differs from its
predecessor's) refuses to open attempts until this row exists.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_reconciliation_complete"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-epochref"></a> `epochRef` | `number` | Seq of the effect_epoch this completion releases. | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-swept"></a> `swept` | `number` | - | `packages/core/dist/index.d.ts` |
