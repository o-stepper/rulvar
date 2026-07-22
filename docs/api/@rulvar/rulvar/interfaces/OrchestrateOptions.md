[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateOptions

# Interface: OrchestrateOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | [`OrchestrateAcceptance`](/api/@rulvar/rulvar/interfaces/OrchestrateAcceptance.md) | The opt in child completion policy; see [OrchestrateAcceptance](/api/@rulvar/rulvar/interfaces/OrchestrateAcceptance.md). | `packages/core/dist/index.d.ts` |
| <a id="property-budget"></a> `budget?` | [`OrchestratorBudgetSpec`](/api/@rulvar/rulvar/interfaces/OrchestratorBudgetSpec.md) | The orchestrator's own budget sub-account (cap enforcement layers only in M6). | `packages/core/dist/index.d.ts` |
| <a id="property-exposechildresulttools"></a> `exposeChildResultTools?` | `boolean` | Opt in to the evidence tools `get_child_result` and `read_child_artifact` (the v1.40.0 improvement plan's narrow RV-201 slice). The digest an await returns is a wake signal truncated to 400 characters; with this set, the orchestrator can page a settled child's FULL output and its artifact contents, both pure reads of durable journal state. Adding the tools changes the orchestrator toolset hash by design (exactly like the extension's plan tools), so leave it off and the default toolset, and every frozen cassette, stay unchanged. | `packages/core/dist/index.d.ts` |
| <a id="property-extension"></a> `extension?` | [`OrchestratorExtension`](/api/@rulvar/rulvar/interfaces/OrchestratorExtension.md) | The opt-in mode (c) extension seam (M7-T05): PlanRunner from @rulvar/plan attaches here. The extension boots strictly before the orchestrator's first agent entry, contributes tools, schedules ready plan nodes on every settlement, and participates in the mandatory quiescence trigger. | `packages/core/dist/index.d.ts` |
| <a id="property-finishvalidation"></a> `finishValidation?` | [`FinishValidationSpec`](/api/@rulvar/rulvar/interfaces/FinishValidationSpec.md) | The opt in deterministic host validation of the finish result, with bounded repair; see [FinishValidationSpec](/api/@rulvar/rulvar/interfaces/FinishValidationSpec.md). | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | UsageLimits of the orchestrator agent itself (maxTurns etc.). | `packages/core/dist/index.d.ts` |
| <a id="property-maxspawns"></a> `maxSpawns?` | `number` | Per-orchestrate spawn cap: a nonnegative integer (zero admits no spawns), validated before any journal entry or dispatch. The engine lifetime cap applies regardless. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-profiles"></a> `profiles?` | `string`[] | Registered profile names to advertise; default: every profile. | `packages/core/dist/index.d.ts` |
| <a id="property-renderbudgetchars"></a> `renderBudgetChars?` | `number` | Deterministic digest render bound: a nonnegative integer, validated before any journal entry or dispatch. Each TaskDigest outputSummary is truncated to AT MOST this many CHARACTERS, the truncation marker included (a budget below 3 keeps the bound with a bare slice; the model-independent measure; OQ-04 closed at M10 entry). Default WAKE_SUMMARY_RENDER_BUDGET_CHARS. | `packages/core/dist/index.d.ts` |
