[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightOrchestratorSpec

# Interface: PreflightOrchestratorSpec

Defined in: [packages/core/src/engine/preflight.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L105)

The OrchestrateOptions slice the estimator consumes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/core/interfaces/OrchestratorBudgetSpec.md) | - | [packages/core/src/engine/preflight.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L106) |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the UNCAPPED orchestrator's priced admission estimate (the goal prompt the runtime would countTokens). A CAPPED orchestrator ignores it: its admission estimate is the shared exact-fill hint (effectiveCap minus the committed finalize carve-out), exactly the live dispatch. | [packages/core/src/engine/preflight.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L118) |
| <a id="property-extension"></a> `extension?` | `boolean` | Whether the orchestration runs under a plan extension (PlanRunner): only extension runs commit the finalize reserve against the run root, so only they subtract it from spawn-admission headroom. | [packages/core/src/engine/preflight.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L124) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | The orchestrator agent's own limits, exactly OrchestrateOptions.limits. | [packages/core/src/engine/preflight.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L110) |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. | [packages/core/src/engine/preflight.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L108) |
