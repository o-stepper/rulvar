[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateOptions

# Interface: OrchestrateOptions

Defined in: `packages/core/dist/index.d.ts`

Options for orchestrate(engine, goal, o?).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/rulvar/interfaces/OrchestratorBudgetSpec.md) | The orchestrator's own budget sub-account (cap enforcement layers only in M6). | `packages/core/dist/index.d.ts` |
| <a id="property-extension"></a> `extension?` | [`OrchestratorExtension`](/api/@rulvar/rulvar/interfaces/OrchestratorExtension.md) | The opt-in mode (c) extension seam (M7-T05): PlanRunner from @rulvar/plan attaches here. The extension boots strictly before the orchestrator's first agent entry, contributes tools, schedules ready plan nodes on every settlement, and participates in the mandatory quiescence trigger. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | UsageLimits of the orchestrator agent itself (maxTurns etc.). | `packages/core/dist/index.d.ts` |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | Per-orchestrate spawn cap; the engine lifetime cap applies regardless. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-profiles"></a> `profiles?` | `string`[] | Registered profile names to advertise; default: every profile. | `packages/core/dist/index.d.ts` |
| <a id="property-renderbudgetchars"></a> `renderBudgetChars?` | `number` | Deterministic digest render bound: each TaskDigest outputSummary is clamped to this many CHARACTERS (the model-independent measure; OQ-04 closed at M10 entry). Default WAKE_SUMMARY_RENDER_BUDGET_CHARS. | `packages/core/dist/index.d.ts` |
