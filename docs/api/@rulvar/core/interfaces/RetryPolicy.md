[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RetryPolicy

# Interface: RetryPolicy

Defined in: [packages/core/src/model/retry.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L17)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts` | `number` | Total tries per serving model, the initial attempt included. | [packages/core/src/model/retry.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L19) |
| <a id="property-backoff"></a> `backoff` | \{ `factor`: `number`; `initialMs`: `number`; `jitter?`: `boolean`; `maxMs`: `number`; \} | - | [packages/core/src/model/retry.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L20) |
| `backoff.factor` | `number` | - | [packages/core/src/model/retry.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L20) |
| `backoff.initialMs` | `number` | - | [packages/core/src/model/retry.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L20) |
| `backoff.jitter?` | `boolean` | - | [packages/core/src/model/retry.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L20) |
| `backoff.maxMs` | `number` | - | [packages/core/src/model/retry.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L20) |
| <a id="property-retryon"></a> `retryOn?` | [`RetryClass`](/api/@rulvar/core/type-aliases/RetryClass.md)[] | Classes that retry; absent = the Appendix A default set. | [packages/core/src/model/retry.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L22) |
