[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAgentParams

# Interface: SpawnAgentParams

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L224)

The spawn parameters as validated JSON (a TaskSpec subset).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L225) |
| <a id="property-approach"></a> `approach?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L231) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L229) |
| <a id="property-lineage"></a> `lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} | [packages/core/src/orchestrator/spawn-tools.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L232) |
| `lineage.causeRef` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L232) |
| `lineage.continues` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L232) |
| `lineage.relation?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L232) |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier?`: `number`; \} | [packages/core/src/orchestrator/spawn-tools.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L230) |
| `model_hint.startTier?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L230) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L227) |
| <a id="property-prompt"></a> `prompt` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L226) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L233) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L228) |
