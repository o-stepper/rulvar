[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightInput

# Interface: PreflightInput

Defined in: [packages/core/src/engine/preflight.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L146)

The full input: engine surface, run surface, and the declared wave.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine?` | `Partial`\&lt;`Pick`\&lt;[`CreateEngineOptions`](/api/@rulvar/core/interfaces/CreateEngineOptions.md), \| `"adapters"` \| `"defaults"` \| `"budgetDefaults"` \| `"concurrency"` \| `"quota"` \| `"pricing"`\&gt;\&gt; | The same object createEngine would receive (adapters used for pure caps() only). | [packages/core/src/engine/preflight.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L148) |
| <a id="property-finishvalidation"></a> `finishValidation?` | \{ `contract?`: [`FinishContract`](/api/@rulvar/core/interfaces/FinishContract.md); `repairTurnReserve?`: `number`; `selfTest?`: [`FinishSelfTestFixtures`](/api/@rulvar/core/interfaces/FinishSelfTestFixtures.md); `validators`: [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[]; \} | The opt in finish validation self test (the v1.71 experiment review, P1.1). Programmatic only: validator functions cannot ride a JSON config file, so the CLI never carries this. When present, preflight runs the SAME golden self test orchestrate runs at construction and reports every drift as an error finding (code 'output-contract-validator-mismatch') instead of throwing, so a planner surfaces it next to the quota and budget findings. | [packages/core/src/engine/preflight.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L176) |
| `finishValidation.contract?` | [`FinishContract`](/api/@rulvar/core/interfaces/FinishContract.md) | - | [packages/core/src/engine/preflight.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L178) |
| `finishValidation.repairTurnReserve?` | `number` | Mirrors FinishValidationSpec.repairTurnReserve: folds the declared repair headroom into the projected turns of the invocation the validators bind (the synthesis invocation when orchestrator.synthesis is declared, the coordination loop otherwise), so the run ceiling prices the repair exchange the runtime would actually grant. | [packages/core/src/engine/preflight.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L188) |
| `finishValidation.selfTest?` | [`FinishSelfTestFixtures`](/api/@rulvar/core/interfaces/FinishSelfTestFixtures.md) | - | [packages/core/src/engine/preflight.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L179) |
| `finishValidation.validators` | [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[] | - | [packages/core/src/engine/preflight.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L177) |
| <a id="property-orchestrator"></a> `orchestrator?` | [`PreflightOrchestratorSpec`](/api/@rulvar/core/interfaces/PreflightOrchestratorSpec.md) | Present when the run is a dynamic orchestration. | [packages/core/src/engine/preflight.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L157) |
| <a id="property-quotarules"></a> `quotaRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The quota rule set behind the configured limiter, when the host uses a rule-driven implementation (memoryQuotaLimiter, SqliteQuotaLimiter): the SPI hides rules behind reserve(), so the demand comparison needs them declared here. | [packages/core/src/engine/preflight.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L166) |
| <a id="property-run"></a> `run?` | `Pick`\&lt;[`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md), `"budgetUsd"` \| `"limits"`\&gt; | The RunOptions slice: the run ceiling and run-level limits. | [packages/core/src/engine/preflight.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L155) |
| <a id="property-spawns"></a> `spawns?` | [`PreflightSpawnSpec`](/api/@rulvar/core/interfaces/PreflightSpawnSpec.md)[] | The declared first spawn wave, in admission order. | [packages/core/src/engine/preflight.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L159) |
