[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostAttribution

# Interface: CostAttribution

Defined in: [packages/core/src/engine/ctx.ts:747](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L747)

Per-run cost attribution buckets consumed by CostReport (M1-T10/T11).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-byagenttype"></a> `byAgentType` | `Map`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/ctx.ts:750](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L750) |
| <a id="property-bymodel"></a> `byModel` | `Map`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/ctx.ts:748](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L748) |
| <a id="property-byphase"></a> `byPhase` | `Map`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/ctx.ts:749](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L749) |
| <a id="property-byrole"></a> `byRole` | `Map`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), `number`\&gt; | - | [packages/core/src/engine/ctx.ts:751](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L751) |
| <a id="property-orchestrator"></a> `orchestrator` | \{ `forcedFinish`: `boolean`; `reserveUsedUsd`: `number`; `spentUsd`: `number`; `wakes`: `number`; \} | The DEF-7 orchestrator block, mutated by the mode (c) machinery. | [packages/core/src/engine/ctx.ts:754](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L754) |
| `orchestrator.forcedFinish` | `boolean` | - | [packages/core/src/engine/ctx.ts:754](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L754) |
| `orchestrator.reserveUsedUsd` | `number` | - | [packages/core/src/engine/ctx.ts:754](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L754) |
| `orchestrator.spentUsd` | `number` | - | [packages/core/src/engine/ctx.ts:754](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L754) |
| `orchestrator.wakes` | `number` | - | [packages/core/src/engine/ctx.ts:754](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L754) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | - | [packages/core/src/engine/ctx.ts:752](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L752) |
