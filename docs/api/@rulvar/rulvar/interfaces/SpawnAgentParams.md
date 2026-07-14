[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpawnAgentParams

# Interface: SpawnAgentParams

Defined in: `packages/core/dist/index.d.ts`

The spawn parameters as validated JSON (a TaskSpec subset).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-approach"></a> `approach?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-lineage"></a> `lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} | `packages/core/dist/index.d.ts` |
| `lineage.causeRef` | `number` | `packages/core/dist/index.d.ts` |
| `lineage.continues` | `string` | `packages/core/dist/index.d.ts` |
| `lineage.relation?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier?`: `number`; \} | `packages/core/dist/index.d.ts` |
| `model_hint.startTier?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-prompt"></a> `prompt` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-taskclass"></a> `taskClass?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | `packages/core/dist/index.d.ts` |
