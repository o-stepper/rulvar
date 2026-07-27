[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightOrchestratorSpec

# Interface: PreflightOrchestratorSpec

Defined in: [packages/core/src/engine/preflight.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L118)

The OrchestrateOptions slice the estimator consumes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | \{ `acceptPartialChildren?`: `boolean`; `acceptValidatedTerminalOutputOnLimit?`: `boolean`; `childPolicy?`: \| `"all-ok"` \| \{ `minSuccessful`: `number`; \}; \} | The OrchestrateAcceptance slice the estimator judges (RV305): declaring it lets preflight relate capped children to the salvage arms. Absent, the salvage findings stay silent, exactly like every other undeclared input. | [packages/core/src/engine/preflight.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L144) |
| `acceptance.acceptPartialChildren?` | `boolean` | - | [packages/core/src/engine/preflight.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L146) |
| `acceptance.acceptValidatedTerminalOutputOnLimit?` | `boolean` | - | [packages/core/src/engine/preflight.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L147) |
| `acceptance.childPolicy?` | \| `"all-ok"` \| \{ `minSuccessful`: `number`; \} | - | [packages/core/src/engine/preflight.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L145) |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/core/interfaces/OrchestratorBudgetSpec.md) | - | [packages/core/src/engine/preflight.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L119) |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the UNCAPPED orchestrator's priced admission estimate (the goal prompt the runtime would countTokens). A CAPPED orchestrator ignores it: its admission estimate is the shared exact-fill hint (effectiveCap minus the committed finalize carve-out), exactly the live dispatch. | [packages/core/src/engine/preflight.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L131) |
| <a id="property-extension"></a> `extension?` | `boolean` | Whether the orchestration runs under a plan extension (PlanRunner): only extension runs commit the finalize reserve against the run root, so only they subtract it from spawn-admission headroom. | [packages/core/src/engine/preflight.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L137) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | The orchestrator agent's own limits, exactly OrchestrateOptions.limits. | [packages/core/src/engine/preflight.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L123) |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. | [packages/core/src/engine/preflight.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L121) |
| <a id="property-synthesis"></a> `synthesis?` | \{ `context?`: `"full"` \| `"digests"`; `estInputTokens?`: `number`; `exposeChildResultTools?`: `boolean`; `limits?`: [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); \} | The separate synthesis invocation (RV-211), when the orchestration configures one (the v1.71 experiment review: the run ceiling used to stop at the coordination loop, undercounting the synthesis turns). `limits` mirrors OrchestrateSynthesis.limits exactly (absent = the DEFAULT_SYNTHESIS_MAX_TURNS invocation), `model` mirrors its model override (absent = defaults.routing.synthesize), and `estInputTokens` is the prompt-size stand-in for the derived synthesis prompt. When `finishValidation.repairTurnReserve` is declared, the reserve folds into THIS invocation's projected turns, because the validators bind the synthesis finish. | [packages/core/src/engine/preflight.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L161) |
| `synthesis.context?` | `"full"` \| `"digests"` | Mirrors OrchestrateSynthesis.context; default 'digests'. | [packages/core/src/engine/preflight.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L173) |
| `synthesis.estInputTokens?` | `number` | - | [packages/core/src/engine/preflight.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L164) |
| `synthesis.exposeChildResultTools?` | `boolean` | Mirrors OrchestrateSynthesis.exposeChildResultTools (the v1.74 experiment review, P0.2): declaring it lets the evidence asymmetry check see that the synthesis model can page the full child outputs the validators judge against. | [packages/core/src/engine/preflight.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L171) |
| `synthesis.limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | - | [packages/core/src/engine/preflight.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L163) |
| `synthesis.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/engine/preflight.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L162) |
