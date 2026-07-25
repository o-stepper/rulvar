[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightOrchestratorSpec

# Interface: PreflightOrchestratorSpec

Defined in: `packages/core/dist/index.d.ts`

The OrchestrateOptions slice the estimator consumes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/rulvar/interfaces/OrchestratorBudgetSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the UNCAPPED orchestrator's priced admission estimate (the goal prompt the runtime would countTokens). A CAPPED orchestrator ignores it: its admission estimate is the shared exact-fill hint (effectiveCap minus the committed finalize carve-out), exactly the live dispatch. | `packages/core/dist/index.d.ts` |
| <a id="property-extension"></a> `extension?` | `boolean` | Whether the orchestration runs under a plan extension (PlanRunner): only extension runs commit the finalize reserve against the run root, so only they subtract it from spawn-admission headroom. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | The orchestrator agent's own limits, exactly OrchestrateOptions.limits. | `packages/core/dist/index.d.ts` |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. | `packages/core/dist/index.d.ts` |
