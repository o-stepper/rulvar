[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightInput

# Interface: PreflightInput

Defined in: [packages/core/src/engine/preflight.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L91)

The full input: engine surface, run surface, and the declared wave.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine?` | `Partial`\&lt;`Pick`\&lt;[`CreateEngineOptions`](/api/@rulvar/core/interfaces/CreateEngineOptions.md), \| `"adapters"` \| `"defaults"` \| `"budgetDefaults"` \| `"concurrency"` \| `"quota"` \| `"pricing"`\&gt;\&gt; | The same object createEngine would receive (adapters used for pure caps() only). | [packages/core/src/engine/preflight.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L93) |
| <a id="property-orchestrator"></a> `orchestrator?` | [`PreflightOrchestratorSpec`](/api/@rulvar/core/interfaces/PreflightOrchestratorSpec.md) | Present when the run is a dynamic orchestration. | [packages/core/src/engine/preflight.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L102) |
| <a id="property-quotarules"></a> `quotaRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The quota rule set behind the configured limiter, when the host uses a rule-driven implementation (memoryQuotaLimiter, SqliteQuotaLimiter): the SPI hides rules behind reserve(), so the demand comparison needs them declared here. | [packages/core/src/engine/preflight.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L111) |
| <a id="property-run"></a> `run?` | `Pick`\&lt;[`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md), `"budgetUsd"` \| `"limits"`\&gt; | The RunOptions slice: the run ceiling and run-level limits. | [packages/core/src/engine/preflight.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L100) |
| <a id="property-spawns"></a> `spawns?` | [`PreflightSpawnSpec`](/api/@rulvar/core/interfaces/PreflightSpawnSpec.md)[] | The declared first spawn wave, in admission order. | [packages/core/src/engine/preflight.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L104) |
