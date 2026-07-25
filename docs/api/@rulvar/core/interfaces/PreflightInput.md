[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightInput

# Interface: PreflightInput

Defined in: [packages/core/src/engine/preflight.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L121)

The full input: engine surface, run surface, and the declared wave.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine?` | `Partial`\&lt;`Pick`\&lt;[`CreateEngineOptions`](/api/@rulvar/core/interfaces/CreateEngineOptions.md), \| `"adapters"` \| `"defaults"` \| `"budgetDefaults"` \| `"concurrency"` \| `"quota"` \| `"pricing"`\&gt;\&gt; | The same object createEngine would receive (adapters used for pure caps() only). | [packages/core/src/engine/preflight.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L123) |
| <a id="property-orchestrator"></a> `orchestrator?` | [`PreflightOrchestratorSpec`](/api/@rulvar/core/interfaces/PreflightOrchestratorSpec.md) | Present when the run is a dynamic orchestration. | [packages/core/src/engine/preflight.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L132) |
| <a id="property-quotarules"></a> `quotaRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The quota rule set behind the configured limiter, when the host uses a rule-driven implementation (memoryQuotaLimiter, SqliteQuotaLimiter): the SPI hides rules behind reserve(), so the demand comparison needs them declared here. | [packages/core/src/engine/preflight.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L141) |
| <a id="property-run"></a> `run?` | `Pick`\&lt;[`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md), `"budgetUsd"` \| `"limits"`\&gt; | The RunOptions slice: the run ceiling and run-level limits. | [packages/core/src/engine/preflight.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L130) |
| <a id="property-spawns"></a> `spawns?` | [`PreflightSpawnSpec`](/api/@rulvar/core/interfaces/PreflightSpawnSpec.md)[] | The declared first spawn wave, in admission order. | [packages/core/src/engine/preflight.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L134) |
