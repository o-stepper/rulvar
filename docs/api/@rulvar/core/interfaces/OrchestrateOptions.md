[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateOptions

# Interface: OrchestrateOptions

Defined in: [packages/core/src/orchestrator/orchestrate.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L77)

docs/06 9.3: orchestrate(engine, goal, o?).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/core/interfaces/OrchestratorBudgetSpec.md) | The orchestrator's own budget sub-account (cap enforcement layers only in M6). | [packages/core/src/orchestrator/orchestrate.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L84) |
| <a id="property-extension"></a> `extension?` | [`OrchestratorExtension`](/api/@rulvar/core/interfaces/OrchestratorExtension.md) | The opt-in mode (c) extension seam (M7-T05): PlanRunner from @rulvar/plan attaches here (docs/07, section 1). The extension boots strictly before the orchestrator's first agent entry, contributes tools, schedules ready plan nodes on every settlement, and participates in the mandatory quiescence trigger. | [packages/core/src/orchestrator/orchestrate.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L101) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | UsageLimits of the orchestrator agent itself (maxTurns etc.). | [packages/core/src/orchestrator/orchestrate.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L93) |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | Per-orchestrate spawn cap; the engine lifetime cap applies regardless. | [packages/core/src/orchestrator/orchestrate.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L82) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/orchestrator/orchestrate.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L78) |
| <a id="property-profiles"></a> `profiles?` | `string`[] | Registered profile names to advertise; default: every profile. | [packages/core/src/orchestrator/orchestrate.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L80) |
| <a id="property-renderbudgetchars"></a> `renderBudgetChars?` | `number` | Deterministic digest render bound (docs/07, section 5): each TaskDigest outputSummary is clamped to this many CHARACTERS (the model-independent measure; OQ-04 closed at M10 entry). Default WAKE_SUMMARY_RENDER_BUDGET_CHARS (docs/06, Appendix A). | [packages/core/src/orchestrator/orchestrate.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L91) |
