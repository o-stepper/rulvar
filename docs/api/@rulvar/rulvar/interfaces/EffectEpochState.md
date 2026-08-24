[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectEpochState

# Interface: EffectEpochState

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-generation"></a> `generation` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-needsreconciliation"></a> `needsReconciliation` | `boolean` | True when this epoch's recorded restoration generation differs from its predecessor's: a restore happened, and attempt dispatch stays disabled until `reconciled` (RFC section 4.5, item 3). | `packages/core/dist/index.d.ts` |
| <a id="property-reconciled"></a> `reconciled` | `boolean` | An effect_reconciliation_complete decision cites this epoch. | `packages/core/dist/index.d.ts` |
| <a id="property-restorationgeneration"></a> `restorationGeneration?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-seq"></a> `seq` | `number` | - | `packages/core/dist/index.d.ts` |
