[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectEpochDecision

# Interface: EffectEpochDecision

Defined in: [packages/core/src/effects/types.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L105)

The epoch fact (RFC section 4.5): before the first effect intent of a
run incarnation the engine appends the run's generation token (from
RunMeta.genesis, which is meta and invisible to a journal-only fold)
and the store-level restoration generation when the store exposes
one. Every intent cites the epoch entry by seq; an intent citing a
non-latest epoch folds void.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_epoch"` | - | [packages/core/src/effects/types.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L106) |
| <a id="property-generation"></a> `generation` | `string` | The run incarnation's generation token (RunMeta.genesis). | [packages/core/src/effects/types.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L109) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L107) |
| <a id="property-restorationgeneration"></a> `restorationGeneration?` | `number` | The store's restoration generation at append time, when exposed. | [packages/core/src/effects/types.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L111) |
