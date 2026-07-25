[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightOrchestratorSpec

# Interface: PreflightOrchestratorSpec

Defined in: [packages/core/src/engine/preflight.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L106)

The OrchestrateOptions slice the estimator consumes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/core/interfaces/OrchestratorBudgetSpec.md) | - | [packages/core/src/engine/preflight.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L107) |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the UNCAPPED orchestrator's priced admission estimate (the goal prompt the runtime would countTokens). A CAPPED orchestrator ignores it: its admission estimate is the shared exact-fill hint (effectiveCap minus the committed finalize carve-out), exactly the live dispatch. | [packages/core/src/engine/preflight.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L119) |
| <a id="property-extension"></a> `extension?` | `boolean` | Whether the orchestration runs under a plan extension (PlanRunner): only extension runs commit the finalize reserve against the run root, so only they subtract it from spawn-admission headroom. | [packages/core/src/engine/preflight.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L125) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | The orchestrator agent's own limits, exactly OrchestrateOptions.limits. | [packages/core/src/engine/preflight.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L111) |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. | [packages/core/src/engine/preflight.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L109) |
| <a id="property-synthesis"></a> `synthesis?` | \{ `estInputTokens?`: `number`; `limits?`: [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); \} | The separate synthesis invocation (RV-211), when the orchestration configures one (the v1.71 experiment review: the run ceiling used to stop at the coordination loop, undercounting the synthesis turns). `limits` mirrors OrchestrateSynthesis.limits exactly (absent = the DEFAULT_SYNTHESIS_MAX_TURNS invocation), `model` mirrors its model override (absent = defaults.routing.synthesize), and `estInputTokens` is the prompt-size stand-in for the derived synthesis prompt. When `finishValidation.repairTurnReserve` is declared, the reserve folds into THIS invocation's projected turns, because the validators bind the synthesis finish. | [packages/core/src/engine/preflight.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L138) |
| `synthesis.estInputTokens?` | `number` | - | [packages/core/src/engine/preflight.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L141) |
| `synthesis.limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | - | [packages/core/src/engine/preflight.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L140) |
| `synthesis.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/engine/preflight.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L139) |
