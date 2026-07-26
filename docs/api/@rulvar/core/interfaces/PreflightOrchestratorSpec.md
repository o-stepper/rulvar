[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightOrchestratorSpec

# Interface: PreflightOrchestratorSpec

Defined in: [packages/core/src/engine/preflight.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L107)

The OrchestrateOptions slice the estimator consumes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/core/interfaces/OrchestratorBudgetSpec.md) | - | [packages/core/src/engine/preflight.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L108) |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the UNCAPPED orchestrator's priced admission estimate (the goal prompt the runtime would countTokens). A CAPPED orchestrator ignores it: its admission estimate is the shared exact-fill hint (effectiveCap minus the committed finalize carve-out), exactly the live dispatch. | [packages/core/src/engine/preflight.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L120) |
| <a id="property-extension"></a> `extension?` | `boolean` | Whether the orchestration runs under a plan extension (PlanRunner): only extension runs commit the finalize reserve against the run root, so only they subtract it from spawn-admission headroom. | [packages/core/src/engine/preflight.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L126) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | The orchestrator agent's own limits, exactly OrchestrateOptions.limits. | [packages/core/src/engine/preflight.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L112) |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. | [packages/core/src/engine/preflight.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L110) |
| <a id="property-synthesis"></a> `synthesis?` | \{ `context?`: `"full"` \| `"digests"`; `estInputTokens?`: `number`; `exposeChildResultTools?`: `boolean`; `limits?`: [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); \} | The separate synthesis invocation (RV-211), when the orchestration configures one (the v1.71 experiment review: the run ceiling used to stop at the coordination loop, undercounting the synthesis turns). `limits` mirrors OrchestrateSynthesis.limits exactly (absent = the DEFAULT_SYNTHESIS_MAX_TURNS invocation), `model` mirrors its model override (absent = defaults.routing.synthesize), and `estInputTokens` is the prompt-size stand-in for the derived synthesis prompt. When `finishValidation.repairTurnReserve` is declared, the reserve folds into THIS invocation's projected turns, because the validators bind the synthesis finish. | [packages/core/src/engine/preflight.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L139) |
| `synthesis.context?` | `"full"` \| `"digests"` | Mirrors OrchestrateSynthesis.context; default 'digests'. | [packages/core/src/engine/preflight.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L151) |
| `synthesis.estInputTokens?` | `number` | - | [packages/core/src/engine/preflight.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L142) |
| `synthesis.exposeChildResultTools?` | `boolean` | Mirrors OrchestrateSynthesis.exposeChildResultTools (the v1.74 experiment review, P0.2): declaring it lets the evidence asymmetry check see that the synthesis model can page the full child outputs the validators judge against. | [packages/core/src/engine/preflight.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L149) |
| `synthesis.limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | - | [packages/core/src/engine/preflight.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L141) |
| `synthesis.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/engine/preflight.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L140) |
