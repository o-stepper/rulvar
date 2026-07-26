[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightInput

# Interface: PreflightInput

Defined in: `packages/core/dist/index.d.ts`

The full input: engine surface, run surface, and the declared wave.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine?` | `Partial`\&lt;`Pick`\&lt;[`CreateEngineOptions`](/api/@rulvar/rulvar/interfaces/CreateEngineOptions.md), \| `"quota"` \| `"adapters"` \| `"defaults"` \| `"budgetDefaults"` \| `"concurrency"` \| `"pricing"`\&gt;\&gt; | The same object createEngine would receive (adapters used for pure caps() only). | `packages/core/dist/index.d.ts` |
| <a id="property-finishvalidation"></a> `finishValidation?` | \{ `contract?`: [`FinishContract`](/api/@rulvar/rulvar/interfaces/FinishContract.md); `maxRepairs?`: `number`; `repairTurnReserve?`: `number`; `selfTest?`: [`FinishSelfTestFixtures`](/api/@rulvar/rulvar/interfaces/FinishSelfTestFixtures.md); `validators`: [`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)[]; \} | The opt in finish validation self test (the v1.71 experiment review, P1.1). Programmatic only: validator functions cannot ride a JSON config file, so the CLI never carries this. When present, preflight runs the SAME golden self test orchestrate runs at construction and reports every drift as an error finding (code 'output-contract-validator-mismatch') instead of throwing, so a planner surfaces it next to the quota and budget findings. | `packages/core/dist/index.d.ts` |
| `finishValidation.contract?` | [`FinishContract`](/api/@rulvar/rulvar/interfaces/FinishContract.md) | - | `packages/core/dist/index.d.ts` |
| `finishValidation.maxRepairs?` | `number` | Mirrors FinishValidationSpec.maxRepairs (default [DEFAULT\_FINISH\_MAX\_REPAIRS](/api/@rulvar/rulvar/variables/DEFAULT_FINISH_MAX_REPAIRS.md)): with zero, the first rejection is final and there is no repair exchange to fund, so the repair-reserve-unfunded warning stays silent. | `packages/core/dist/index.d.ts` |
| `finishValidation.repairTurnReserve?` | `number` | Mirrors FinishValidationSpec.repairTurnReserve: folds the declared repair headroom into the projected turns of the invocation the validators bind (the synthesis invocation when orchestrator.synthesis is declared, the coordination loop otherwise), so the run ceiling prices the repair exchange the runtime would actually grant. | `packages/core/dist/index.d.ts` |
| `finishValidation.selfTest?` | [`FinishSelfTestFixtures`](/api/@rulvar/rulvar/interfaces/FinishSelfTestFixtures.md) | - | `packages/core/dist/index.d.ts` |
| `finishValidation.validators` | [`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-orchestrator"></a> `orchestrator?` | [`PreflightOrchestratorSpec`](/api/@rulvar/rulvar/interfaces/PreflightOrchestratorSpec.md) | Present when the run is a dynamic orchestration. | `packages/core/dist/index.d.ts` |
| <a id="property-quotarules"></a> `quotaRules?` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] | The quota rule set behind the configured limiter, when the host uses a rule-driven implementation (memoryQuotaLimiter, SqliteQuotaLimiter): the SPI hides rules behind reserve(), so the demand comparison needs them declared here. | `packages/core/dist/index.d.ts` |
| <a id="property-run"></a> `run?` | `Pick`\&lt;[`RunOptions`](/api/@rulvar/rulvar/interfaces/RunOptions.md), `"budgetUsd"` \| `"limits"`\&gt; | The RunOptions slice: the run ceiling and run-level limits. | `packages/core/dist/index.d.ts` |
| <a id="property-spawns"></a> `spawns?` | [`PreflightSpawnSpec`](/api/@rulvar/rulvar/interfaces/PreflightSpawnSpec.md)[] | The declared first spawn wave, in admission order. | `packages/core/dist/index.d.ts` |
