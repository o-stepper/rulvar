[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightInput

# Interface: PreflightInput

Defined in: [packages/core/src/engine/preflight.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L156)

The full input: engine surface, run surface, and the declared wave.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine?` | `Partial`\&lt;`Pick`\&lt;[`CreateEngineOptions`](/api/@rulvar/core/interfaces/CreateEngineOptions.md), \| `"adapters"` \| `"defaults"` \| `"budgetDefaults"` \| `"concurrency"` \| `"quota"` \| `"pricing"`\&gt;\&gt; | The same object createEngine would receive (adapters used for pure caps() only). | [packages/core/src/engine/preflight.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L158) |
| <a id="property-finishvalidation"></a> `finishValidation?` | \{ `contract?`: [`FinishContract`](/api/@rulvar/core/interfaces/FinishContract.md); `maxRepairs?`: `number`; `repairTurnReserve?`: `number`; `selfTest?`: [`FinishSelfTestFixtures`](/api/@rulvar/core/interfaces/FinishSelfTestFixtures.md); `validators`: [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[]; \} | The opt in finish validation self test (the v1.71 experiment review, P1.1). Programmatic only: validator functions cannot ride a JSON config file, so the CLI never carries this. When present, preflight runs the SAME golden self test orchestrate runs at construction and reports every drift as an error finding instead of throwing, so a planner surfaces it next to the quota and budget findings: 'output-contract-validator-mismatch' for containment and accept-side drift, 'output-contract-validator-weakened' (cycle 74) when a configured validator fails the contract's per validator reject golden, the same-name weakened replacement. | [packages/core/src/engine/preflight.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L189) |
| `finishValidation.contract?` | [`FinishContract`](/api/@rulvar/core/interfaces/FinishContract.md) | - | [packages/core/src/engine/preflight.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L191) |
| `finishValidation.maxRepairs?` | `number` | Mirrors FinishValidationSpec.maxRepairs (default [DEFAULT\_FINISH\_MAX\_REPAIRS](/api/@rulvar/core/variables/DEFAULT_FINISH_MAX_REPAIRS.md)): with zero, the first rejection is final and there is no repair exchange to fund, so the repair-reserve-unfunded warning stays silent. | [packages/core/src/engine/preflight.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L208) |
| `finishValidation.repairTurnReserve?` | `number` | Mirrors FinishValidationSpec.repairTurnReserve: folds the declared repair headroom into the projected turns of the invocation the validators bind (the synthesis invocation when orchestrator.synthesis is declared, the coordination loop otherwise), so the run ceiling prices the repair exchange the runtime would actually grant. | [packages/core/src/engine/preflight.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L201) |
| `finishValidation.selfTest?` | [`FinishSelfTestFixtures`](/api/@rulvar/core/interfaces/FinishSelfTestFixtures.md) | - | [packages/core/src/engine/preflight.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L192) |
| `finishValidation.validators` | [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[] | - | [packages/core/src/engine/preflight.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L190) |
| <a id="property-orchestrator"></a> `orchestrator?` | [`PreflightOrchestratorSpec`](/api/@rulvar/core/interfaces/PreflightOrchestratorSpec.md) | Present when the run is a dynamic orchestration. | [packages/core/src/engine/preflight.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L167) |
| <a id="property-quotarules"></a> `quotaRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The quota rule set behind the configured limiter, when the host uses a rule-driven implementation (memoryQuotaLimiter, SqliteQuotaLimiter): the SPI hides rules behind reserve(), so the demand comparison needs them declared here. | [packages/core/src/engine/preflight.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L176) |
| <a id="property-run"></a> `run?` | `Pick`\&lt;[`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md), `"budgetUsd"` \| `"limits"`\&gt; | The RunOptions slice: the run ceiling and run-level limits. | [packages/core/src/engine/preflight.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L165) |
| <a id="property-spawns"></a> `spawns?` | [`PreflightSpawnSpec`](/api/@rulvar/core/interfaces/PreflightSpawnSpec.md)[] | The declared first spawn wave, in admission order. | [packages/core/src/engine/preflight.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L169) |
