[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostReport

# Interface: CostReport

Defined in: [packages/core/src/engine/run-handle.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L24)

Full contract: https://docs.rulvar.com/guide/observability.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-byagenttype"></a> `byAgentType` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/run-handle.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L30) |
| <a id="property-bymodel"></a> `byModel` | `Record`\&lt;`string`, `number`\&gt; | Keyed by canonical ModelRef 'adapterId:model'. | [packages/core/src/engine/run-handle.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L27) |
| <a id="property-byphase"></a> `byPhase` | `Record`\&lt;`string`, `number`\&gt; | ctx.phase names; phase is structural for this map. | [packages/core/src/engine/run-handle.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L29) |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), `number`\&gt; | - | [packages/core/src/engine/run-handle.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L31) |
| <a id="property-orchestrator"></a> `orchestrator` | \{ `forcedFinish`: `boolean`; `reserveUsedUsd`: `number`; `share`: `number`; `spentUsd`: `number`; `wakes`: `number`; \} | All-zero with forcedFinish false in runs without a dynamic orchestrator (or when no cap resolved, so no sub-account opened). Folded purely from the journal: spentUsd is the priced usage of entries debited to the orchestrator sub-account, reserveUsedUsd its reserve-funded forced-finish share, wakes the ARMED (journaled) wake suspensions (a wait satisfied synchronously never suspends and is not counted), and forcedFinish the journaled at-cap decision. | [packages/core/src/engine/run-handle.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L41) |
| `orchestrator.forcedFinish` | `boolean` | - | [packages/core/src/engine/run-handle.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L46) |
| `orchestrator.reserveUsedUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L47) |
| `orchestrator.share` | `number` | spentUsd / max(totalUsd, 0.01): the epsilon-floored H-OrchShare input. | [packages/core/src/engine/run-handle.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L44) |
| `orchestrator.spentUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L42) |
| `orchestrator.wakes` | `number` | - | [packages/core/src/engine/run-handle.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L45) |
| <a id="property-totalusd"></a> `totalUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L25) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | Usage on models absent from pricing; never a silent zero. | [packages/core/src/engine/run-handle.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L50) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | Present and true when any terminal entry folded into totalUsd carried approximate usage (a transport cut, a stream the ceiling severed, or an abort estimated the turn instead of the provider reporting it), so totalUsd is a lower bound estimate, never an exact charge. Absent means every contributing entry reported exact usage. The field the v1.39.0 review asked the report to raise so approximate cost is never shown as though it were the provider invoice. | [packages/core/src/engine/run-handle.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L60) |
