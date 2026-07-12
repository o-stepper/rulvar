[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostAttribution

# Interface: CostAttribution

Defined in: [packages/core/src/engine/ctx.ts:509](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L509)

Per-run cost attribution buckets consumed by CostReport (M1-T10/T11).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-byagenttype"></a> `byAgentType` | `Map`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/ctx.ts:512](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L512) |
| <a id="property-bymodel"></a> `byModel` | `Map`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/ctx.ts:510](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L510) |
| <a id="property-byphase"></a> `byPhase` | `Map`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/ctx.ts:511](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L511) |
| <a id="property-byrole"></a> `byRole` | `Map`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), `number`\&gt; | - | [packages/core/src/engine/ctx.ts:513](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L513) |
| <a id="property-orchestrator"></a> `orchestrator` | \{ `forcedFinish`: `boolean`; `reserveUsedUsd`: `number`; `spentUsd`: `number`; `wakes`: `number`; \} | The DEF-7 orchestrator block, mutated by the mode (c) machinery. | [packages/core/src/engine/ctx.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L516) |
| `orchestrator.forcedFinish` | `boolean` | - | [packages/core/src/engine/ctx.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L516) |
| `orchestrator.reserveUsedUsd` | `number` | - | [packages/core/src/engine/ctx.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L516) |
| `orchestrator.spentUsd` | `number` | - | [packages/core/src/engine/ctx.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L516) |
| `orchestrator.wakes` | `number` | - | [packages/core/src/engine/ctx.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L516) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | - | [packages/core/src/engine/ctx.ts:514](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L514) |
