[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RetryPolicy

# Interface: RetryPolicy

Defined in: [packages/core/src/model/retry.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L16)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts` | `number` | Total tries per serving model, the initial attempt included. | [packages/core/src/model/retry.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L18) |
| <a id="property-backoff"></a> `backoff` | \{ `factor`: `number`; `initialMs`: `number`; `jitter?`: `boolean`; `maxMs`: `number`; \} | - | [packages/core/src/model/retry.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L19) |
| `backoff.factor` | `number` | - | [packages/core/src/model/retry.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L19) |
| `backoff.initialMs` | `number` | - | [packages/core/src/model/retry.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L19) |
| `backoff.jitter?` | `boolean` | - | [packages/core/src/model/retry.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L19) |
| `backoff.maxMs` | `number` | - | [packages/core/src/model/retry.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L19) |
| <a id="property-retryon"></a> `retryOn?` | [`RetryClass`](/api/@rulvar/core/type-aliases/RetryClass.md)[] | Classes that retry; absent = the Appendix A default set. | [packages/core/src/model/retry.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L21) |
