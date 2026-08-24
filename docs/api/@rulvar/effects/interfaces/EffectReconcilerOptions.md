[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectReconcilerOptions

# Interface: EffectReconcilerOptions

Defined in: [packages/effects/src/reconciler.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L44)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dispatcher"></a> `dispatcher?` | [`EffectDispatcher`](/api/@rulvar/effects/classes/EffectDispatcher.md) | Optional: without it the sweep only quarantines and reports. | [packages/effects/src/reconciler.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L47) |
| <a id="property-now"></a> `now?` | () => `string` | - | [packages/effects/src/reconciler.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L48) |
| <a id="property-writer"></a> `writer` | [`EffectLaneWriter`](/api/@rulvar/rulvar/classes/EffectLaneWriter.md) | - | [packages/effects/src/reconciler.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L45) |
