[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostReport

# Interface: CostReport

Defined in: [packages/core/src/engine/run-handle.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L26)

docs/09, section "CostReport".

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-byagenttype"></a> `byAgentType` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/run-handle.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L32) |
| <a id="property-bymodel"></a> `byModel` | `Record`\&lt;`string`, `number`\&gt; | Keyed by canonical ModelRef 'adapterId:model'. | [packages/core/src/engine/run-handle.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L29) |
| <a id="property-byphase"></a> `byPhase` | `Record`\&lt;`string`, `number`\&gt; | ctx.phase names; phase is structural for this map. | [packages/core/src/engine/run-handle.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L31) |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), `number`\&gt; | - | [packages/core/src/engine/run-handle.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L33) |
| <a id="property-orchestrator"></a> `orchestrator` | \{ `forcedFinish`: `boolean`; `reserveUsedUsd`: `number`; `share`: `number`; `spentUsd`: `number`; `wakes`: `number`; \} | All-zero with forcedFinish false in runs without a dynamic orchestrator. | [packages/core/src/engine/run-handle.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L35) |
| `orchestrator.forcedFinish` | `boolean` | - | [packages/core/src/engine/run-handle.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L40) |
| `orchestrator.reserveUsedUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L41) |
| `orchestrator.share` | `number` | spentUsd / max(totalUsd, 0.01): the epsilon-floored H-OrchShare input. | [packages/core/src/engine/run-handle.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L38) |
| `orchestrator.spentUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L36) |
| `orchestrator.wakes` | `number` | - | [packages/core/src/engine/run-handle.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L39) |
| <a id="property-totalusd"></a> `totalUsd` | `number` | - | [packages/core/src/engine/run-handle.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L27) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | Usage on models absent from pricing; never a silent zero. | [packages/core/src/engine/run-handle.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L44) |
