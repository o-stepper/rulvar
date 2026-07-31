[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EngineQuotaConfig

# Interface: EngineQuotaConfig

Defined in: `packages/core/dist/index.d.ts`

createEngine quota config: the limiter plus its engine-scoped knobs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-declaredrules"></a> `declaredRules?` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] | The drift telemetry opt-in (the v1.71 experiment review, P0.5 resized): the SAME rule declaration `preflightEstimate` takes as `quotaRules`, mirrored here so the engine can hold it against what providers actually REPORT. When a live 429 carries provider-normalized limits (the openai and anthropic adapters parse the x-ratelimit headers into `WireError.data.reportedLimits`) and a declared per-minute cap EXCEEDS the reported one, the run journals a `quota_drift` decision (provider, model, tenant, dimension, declared, reported; one per invocation and dimension) and emits a warn log, because a limiter configured above the provider's real ceiling under-throttles and live denials follow: the experiment inflated 12M TPM over a real 1M and paid seven live 429s with nothing recording the mismatch. Purely observational: nothing clamps, the limiter keeps enforcing the declaration (clamping is host policy). Absent = byte identical journals and events. | `packages/core/dist/index.d.ts` |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-onlimitererror"></a> `onLimiterError?` | `"allow"` \| `"deny"` | What a limiter infrastructure FAILURE (reserve throwing) means: 'deny' (default, fail closed) converts it into a retryable transport-class denial; 'allow' logs a warning and dispatches without a reservation. A limiter DENIAL is unaffected by this knob. reconcile failures only ever warn. | `packages/core/dist/index.d.ts` |
| <a id="property-reservecontinuations"></a> `reserveContinuations?` | `boolean` | The opt-in hard mode for provider-side continuations (RV1013). Default off: a dispatch reserves ONE request and a multi-wire absorption (`pause_turn`) settles its true wire count post-hoc, which is accounting, not admission: the continuations already left. With `reserveContinuations: true` the engine reserves each continuation in the limiter BEFORE its egress through the adapter-side StreamHooks seam: under a hard provider RPM cap the over-cap wire never leaves (the denial rides the provider-429 machinery), a granted admission whose wire never left is released back to the window where the limiter implements `release`, and the post-hoc settlement stops re-adding individually admitted segments so the window is never double-counted. Adapters unaware of the hook keep the post-hoc semantics exactly. | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | Stamped on every reservation of this engine's runs. | `packages/core/dist/index.d.ts` |
