[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / RestorationReport

# Interface: RestorationReport

Defined in: [packages/effects/src/reconciler.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L34)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-completionseq"></a> `completionSeq` | `number` | Seq of the appended effect_reconciliation_complete decision. | [packages/effects/src/reconciler.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L41) |
| <a id="property-rangequarantined"></a> `rangeQuarantined` | `boolean` | True when no enumeration exists and the range quarantined whole. | [packages/effects/src/reconciler.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L38) |
| <a id="property-sweep"></a> `sweep` | [`EffectSweepReport`](/api/@rulvar/effects/interfaces/EffectSweepReport.md) | - | [packages/effects/src/reconciler.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L39) |
| <a id="property-unreconstructable"></a> `unreconstructable` | `string`[] | Provider effects with no journaled intent: quarantined by name. | [packages/effects/src/reconciler.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L36) |
