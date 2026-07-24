[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightOrchestratorSpec

# Interface: PreflightOrchestratorSpec

Defined in: [packages/core/src/engine/preflight.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L76)

The OrchestrateOptions slice the estimator consumes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/core/interfaces/OrchestratorBudgetSpec.md) | - | [packages/core/src/engine/preflight.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L77) |
| <a id="property-extension"></a> `extension?` | `boolean` | Whether the orchestration runs under a plan extension (PlanRunner): only extension runs commit the finalize reserve against the run root, so only they subtract it from spawn-admission headroom. | [packages/core/src/engine/preflight.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L87) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | The orchestrator agent's own limits, exactly OrchestrateOptions.limits. | [packages/core/src/engine/preflight.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L81) |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. | [packages/core/src/engine/preflight.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L79) |
