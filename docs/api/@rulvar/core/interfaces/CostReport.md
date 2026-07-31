[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostReport

# Interface: CostReport

Defined in: [packages/core/src/engine/run-handle.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L25)

Full contract: https://docs.rulvar.com/guide/observability.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned` | \{ `unpriced`: \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[]; `usageApprox?`: `boolean`; `usd`: `number`; \} | Priced spend under abandoned subtrees, exactly the part totalUsd excludes. `unpriced` here surfaces abandoned slices with no price row (the top-level `unpriced` lists only slices contributing to totalUsd), and `usageApprox` follows the same semantics as the top-level flag over the abandoned entries; grossUsd is an estimate whenever either flag is raised. | [packages/core/src/engine/run-handle.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L49) |
| `abandoned.unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | - | [packages/core/src/engine/run-handle.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L51) |
| `abandoned.usageApprox?` | `boolean` | - | [packages/core/src/engine/run-handle.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L52) |
| `abandoned.usd` | `number` | - | [packages/core/src/engine/run-handle.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L50) |
| <a id="property-byagenttype"></a> `byAgentType` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/run-handle.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L58) |
| <a id="property-bymodel"></a> `byModel` | `Record`\&lt;`string`, `number`\&gt; | Keyed by canonical ModelRef 'adapterId:model'. | [packages/core/src/engine/run-handle.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L55) |
| <a id="property-byphase"></a> `byPhase` | `Record`\&lt;`string`, `number`\&gt; | ctx.phase names; phase is structural for this map. | [packages/core/src/engine/run-handle.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L57) |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), `number`\&gt; | - | [packages/core/src/engine/run-handle.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L59) |
| <a id="property-grossusd"></a> `grossUsd` | `number` | The gross/net split (P1.3): totalUsd + abandoned.usd, every priced terminal slice with abandonment included. This is the immutable provider-spend figure an invoice reconciles against; abandoning a branch never shrinks it. | [packages/core/src/engine/run-handle.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L40) |
| <a id="property-orchestrator"></a> `orchestrator` | \{ `forcedFinish`: `boolean`; `reserveUsedUsd`: `number`; `share`: `number`; `spentUsd`: `number`; `wakes`: `number`; \} | All-zero with forcedFinish false in runs without a dynamic orchestrator (or when no cap resolved, so no sub-account opened). Folded purely from the journal: spentUsd is the priced usage of entries debited to the orchestrator sub-account, reserveUsedUsd its reserve-funded forced-finish share, wakes the ARMED (journaled) wake suspensions (a wait satisfied synchronously never suspends and is not counted), and forcedFinish the journaled at-cap decision. | [packages/core/src/engine/run-handle.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L69) |
| `orchestrator.forcedFinish` | `boolean` | - | [packages/core/src/engine/run-handle.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L74) |
| `orchestrator.reserveUsedUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L75) |
| `orchestrator.share` | `number` | spentUsd / max(totalUsd, 0.01): the epsilon-floored H-OrchShare input. | [packages/core/src/engine/run-handle.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L72) |
| `orchestrator.spentUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L70) |
| `orchestrator.wakes` | `number` | - | [packages/core/src/engine/run-handle.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L73) |
| <a id="property-totalusd"></a> `totalUsd` | `number` | The NET ledger: priced terminal usage with abandoned subtrees contributing zero (their spend is a sunk cost of branches the orchestrator discarded, not of the work the run kept). The provider still billed them: reconcile invoices against `grossUsd`, never this. | [packages/core/src/engine/run-handle.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L33) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | Usage on models absent from pricing; never a silent zero. | [packages/core/src/engine/run-handle.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L78) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | Present and true when any terminal entry folded into totalUsd carried approximate usage (a transport cut, a stream the ceiling severed, or an abort estimated the turn instead of the provider reporting it), so totalUsd is a lower bound estimate, never an exact charge. Absent means every contributing entry reported exact usage. The field the v1.39.0 review asked the report to raise so approximate cost is never shown as though it were the provider invoice. | [packages/core/src/engine/run-handle.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L88) |
