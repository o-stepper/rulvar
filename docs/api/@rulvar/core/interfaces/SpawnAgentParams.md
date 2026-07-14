[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAgentParams

# Interface: SpawnAgentParams

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L117)

The spawn parameters as validated JSON (a TaskSpec subset).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L118) |
| <a id="property-approach"></a> `approach?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L124) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L122) |
| <a id="property-lineage"></a> `lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} | [packages/core/src/orchestrator/spawn-tools.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L125) |
| `lineage.causeRef` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L125) |
| `lineage.continues` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L125) |
| `lineage.relation?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L125) |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier?`: `number`; \} | [packages/core/src/orchestrator/spawn-tools.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L123) |
| `model_hint.startTier?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L123) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L120) |
| <a id="property-prompt"></a> `prompt` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L119) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L126) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L121) |
