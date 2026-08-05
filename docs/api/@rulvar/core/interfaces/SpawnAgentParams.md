[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAgentParams

# Interface: SpawnAgentParams

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L199)

The spawn parameters as validated JSON (a TaskSpec subset).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L200) |
| <a id="property-approach"></a> `approach?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L206) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L204) |
| <a id="property-lineage"></a> `lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} | [packages/core/src/orchestrator/spawn-tools.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L207) |
| `lineage.causeRef` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L207) |
| `lineage.continues` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L207) |
| `lineage.relation?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L207) |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier?`: `number`; \} | [packages/core/src/orchestrator/spawn-tools.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L205) |
| `model_hint.startTier?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L205) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L202) |
| <a id="property-prompt"></a> `prompt` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L201) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L208) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L203) |
