[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EngineQuotaConfig

# Interface: EngineQuotaConfig

Defined in: `packages/core/dist/index.d.ts`

createEngine quota config: the limiter plus its engine-scoped knobs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-onlimitererror"></a> `onLimiterError?` | `"allow"` \| `"deny"` | What a limiter infrastructure FAILURE (reserve throwing) means: 'deny' (default, fail closed) converts it into a retryable transport-class denial; 'allow' logs a warning and dispatches without a reservation. A limiter DENIAL is unaffected by this knob. reconcile failures only ever warn. | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | Stamped on every reservation of this engine's runs. | `packages/core/dist/index.d.ts` |
