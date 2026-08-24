[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectDispatcherOptions

# Interface: EffectDispatcherOptions

Defined in: [packages/effects/src/dispatcher.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L45)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapter"></a> `adapter` | [`EffectAdapter`](/api/@rulvar/effects/interfaces/EffectAdapter.md) | - | [packages/effects/src/dispatcher.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L47) |
| <a id="property-attemptttlms"></a> `attemptTtlMs?` | `number` | Milliseconds of send-deadline headroom on minted attempts. | [packages/effects/src/dispatcher.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L52) |
| <a id="property-now"></a> `now?` | () => `string` | - | [packages/effects/src/dispatcher.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L50) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/effects/src/dispatcher.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L48) |
| <a id="property-verifyreceipt"></a> `verifyReceipt?` | [`ReceiptVerifier`](/api/@rulvar/effects/type-aliases/ReceiptVerifier.md) | - | [packages/effects/src/dispatcher.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L49) |
| <a id="property-writer"></a> `writer` | [`EffectLaneWriter`](/api/@rulvar/rulvar/classes/EffectLaneWriter.md) | - | [packages/effects/src/dispatcher.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L46) |
