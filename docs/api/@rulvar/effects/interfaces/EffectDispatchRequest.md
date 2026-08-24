[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectDispatchRequest

# Interface: EffectDispatchRequest

Defined in: [packages/effects/src/adapter.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L41)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attemptseq"></a> `attemptSeq` | `number` | Seq of the attempt record appended BEFORE this send. | [packages/effects/src/adapter.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L45) |
| <a id="property-idempotencykey"></a> `idempotencyKey?` | `string` | The provider idempotency key when the row carries one: stable across attempts of one intent (it embeds the logical key and the epoch), which is exactly what makes a re-dispatch safe on the 'idempotency-key' row. | [packages/effects/src/adapter.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L54) |
| <a id="property-intent"></a> `intent` | [`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md) | - | [packages/effects/src/adapter.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L43) |
| <a id="property-notafter"></a> `notAfter` | `string` | The attempt's send deadline (defense in depth, never proof). | [packages/effects/src/adapter.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L56) |
| <a id="property-ordinal"></a> `ordinal` | `number` | The attempt's 1-based ordinal under the intent. | [packages/effects/src/adapter.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L47) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/effects/src/adapter.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L42) |
