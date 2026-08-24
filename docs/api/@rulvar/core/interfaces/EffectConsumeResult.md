[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectConsumeResult

# Interface: EffectConsumeResult

Defined in: [packages/core/src/effects/writer.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L85)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-intentseq"></a> `intentSeq` | `number` | - | [packages/core/src/effects/writer.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L86) |
| <a id="property-machine"></a> `machine` | [`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md) | - | [packages/core/src/effects/writer.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L87) |
| <a id="property-replayed"></a> `replayed` | `boolean` | True when the opId was already in the journal (recovery). | [packages/core/src/effects/writer.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L89) |
