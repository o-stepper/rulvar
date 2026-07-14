[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CostAttribution

# Interface: CostAttribution

Defined in: `packages/core/dist/index.d.ts`

Per-run cost attribution buckets consumed by CostReport (M1-T10/T11).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-byagenttype"></a> `byAgentType` | `Map`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-bymodel"></a> `byModel` | `Map`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-byphase"></a> `byPhase` | `Map`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-byrole"></a> `byRole` | `Map`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-orchestrator"></a> `orchestrator` | \{ `forcedFinish`: `boolean`; `reserveUsedUsd`: `number`; `spentUsd`: `number`; `wakes`: `number`; \} | The DEF-7 orchestrator block, mutated by the mode (c) machinery. | `packages/core/dist/index.d.ts` |
| `orchestrator.forcedFinish` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `orchestrator.reserveUsedUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `orchestrator.spentUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `orchestrator.wakes` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); \}[] | - | `packages/core/dist/index.d.ts` |
