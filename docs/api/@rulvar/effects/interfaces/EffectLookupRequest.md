[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectLookupRequest

# Interface: EffectLookupRequest

Defined in: [packages/effects/src/adapter.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L65)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attemptseq"></a> `attemptSeq?` | `number` | The ambiguous attempt an acceptance closure targets: closure is per attempt identity (RFC section 6), so the provider can refuse exactly the in-flight request while a FRESH attempt stays legal. | [packages/effects/src/adapter.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L74) |
| <a id="property-idempotencykey"></a> `idempotencyKey?` | `string` | - | [packages/effects/src/adapter.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L68) |
| <a id="property-intent"></a> `intent` | [`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md) | - | [packages/effects/src/adapter.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L67) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/effects/src/adapter.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L66) |
