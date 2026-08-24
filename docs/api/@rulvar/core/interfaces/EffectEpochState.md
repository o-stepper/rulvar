[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectEpochState

# Interface: EffectEpochState

Defined in: [packages/core/src/effects/fold.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L179)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-generation"></a> `generation` | `string` | - | [packages/core/src/effects/fold.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L181) |
| <a id="property-needsreconciliation"></a> `needsReconciliation` | `boolean` | True when this epoch's recorded restoration generation differs from its predecessor's: a restore happened, and attempt dispatch stays disabled until `reconciled` (RFC section 4.5, item 3). | [packages/core/src/effects/fold.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L188) |
| <a id="property-reconciled"></a> `reconciled` | `boolean` | An effect_reconciliation_complete decision cites this epoch. | [packages/core/src/effects/fold.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L190) |
| <a id="property-restorationgeneration"></a> `restorationGeneration?` | `number` | - | [packages/core/src/effects/fold.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L182) |
| <a id="property-seq"></a> `seq` | `number` | - | [packages/core/src/effects/fold.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L180) |
