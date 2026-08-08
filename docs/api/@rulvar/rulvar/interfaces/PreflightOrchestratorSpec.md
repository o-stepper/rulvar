[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightOrchestratorSpec

# Interface: PreflightOrchestratorSpec

Defined in: `packages/core/dist/index.d.ts`

The OrchestrateOptions slice the estimator consumes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | \{ `acceptPartialChildren?`: `boolean`; `acceptValidatedTerminalOutputOnLimit?`: `boolean`; `childPolicy?`: \| `"all-ok"` \| \{ `minSuccessful`: `number`; \}; `minSpawnedChildren?`: `number`; \} | The OrchestrateAcceptance slice the estimator judges (RV305): declaring it lets preflight relate capped children to the salvage arms. Absent, the salvage findings stay silent, exactly like every other undeclared input. | `packages/core/dist/index.d.ts` |
| `acceptance.acceptPartialChildren?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `acceptance.acceptValidatedTerminalOutputOnLimit?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `acceptance.childPolicy?` | \| `"all-ok"` \| \{ `minSuccessful`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `acceptance.minSpawnedChildren?` | `number` | Mirrors OrchestrateAcceptance.minSpawnedChildren (RV1901, the four-role benchmark's primary defect): declaring it lets the admission projection judge whether the declared wave can seat the roster the acceptance policy demands, instead of green- lighting a wave the settle verdict is bound to reject. | `packages/core/dist/index.d.ts` |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/rulvar/interfaces/OrchestratorBudgetSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-claimconsistency"></a> `claimConsistency?` | \{ `judge?`: \{ `estCost?`: `number`; \}; \} | The claim-consistency judge's admission estimate (RV2106), exactly OrchestrateClaimConsistency.judge.estCost: the post-fan-in judge admits against the ORCHESTRATOR account, whose working room past the held synthesis reserve the coordination loop's own turns spend from first. Declaring the estimate lets the estimator judge that room statically (`orchestrator-working-room`); absent, the finding stays silent, exactly like every other undeclared input. | `packages/core/dist/index.d.ts` |
| `claimConsistency.judge?` | \{ `estCost?`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `claimConsistency.judge.estCost?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the UNCAPPED orchestrator's priced admission estimate (the goal prompt the runtime would countTokens). A CAPPED orchestrator ignores it: its admission estimate is the shared exact-fill hint (effectiveCap minus the committed finalize carve-out), exactly the live dispatch. | `packages/core/dist/index.d.ts` |
| <a id="property-extension"></a> `extension?` | `boolean` | Whether the orchestration runs under a plan extension (PlanRunner): only extension runs commit the finalize reserve against the run root, so only they subtract it from spawn-admission headroom. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | The orchestrator agent's own limits, exactly OrchestrateOptions.limits. | `packages/core/dist/index.d.ts` |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesis"></a> `synthesis?` | \{ `context?`: `"full"` \| `"digests"`; `estInputTokens?`: `number`; `exposeChildResultTools?`: `boolean`; `limits?`: [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md); \} | The separate synthesis invocation (RV-211), when the orchestration configures one (the v1.71 experiment review: the run ceiling used to stop at the coordination loop, undercounting the synthesis turns). `limits` mirrors OrchestrateSynthesis.limits exactly (absent = the DEFAULT_SYNTHESIS_MAX_TURNS invocation), `model` mirrors its model override (absent = defaults.routing.synthesize), and `estInputTokens` is the prompt-size stand-in for the derived synthesis prompt. When `finishValidation.repairTurnReserve` is declared, the reserve folds into THIS invocation's projected turns, because the validators bind the synthesis finish. | `packages/core/dist/index.d.ts` |
| `synthesis.context?` | `"full"` \| `"digests"` | - | `packages/core/dist/index.d.ts` |
| `synthesis.estInputTokens?` | `number` | - | `packages/core/dist/index.d.ts` |
| `synthesis.exposeChildResultTools?` | `boolean` | Mirrors OrchestrateSynthesis.exposeChildResultTools (the v1.74 experiment review, P0.2): declaring it lets the evidence asymmetry check see that the synthesis model can page the full child outputs the validators judge against. | `packages/core/dist/index.d.ts` |
| `synthesis.limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | - | `packages/core/dist/index.d.ts` |
| `synthesis.model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | - | `packages/core/dist/index.d.ts` |
