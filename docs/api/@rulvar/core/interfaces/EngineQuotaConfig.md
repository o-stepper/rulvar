[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineQuotaConfig

# Interface: EngineQuotaConfig

Defined in: [packages/core/src/model/quota.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L313)

createEngine quota config: the limiter plus its engine-scoped knobs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md) | - | [packages/core/src/model/quota.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L314) |
| <a id="property-onlimitererror"></a> `onLimiterError?` | `"allow"` \| `"deny"` | What a limiter infrastructure FAILURE (reserve throwing) means: 'deny' (default, fail closed) converts it into a retryable transport-class denial; 'allow' logs a warning and dispatches without a reservation. A limiter DENIAL is unaffected by this knob. reconcile failures only ever warn. | [packages/core/src/model/quota.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L324) |
| <a id="property-tenant"></a> `tenant?` | `string` | Stamped on every reservation of this engine's runs. | [packages/core/src/model/quota.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L316) |
