[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAgentParams

# Interface: SpawnAgentParams

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L150)

The spawn parameters as validated JSON (a TaskSpec subset).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L151) |
| <a id="property-approach"></a> `approach?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L157) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L155) |
| <a id="property-lineage"></a> `lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} | [packages/core/src/orchestrator/spawn-tools.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L158) |
| `lineage.causeRef` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L158) |
| `lineage.continues` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L158) |
| `lineage.relation?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L158) |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier?`: `number`; \} | [packages/core/src/orchestrator/spawn-tools.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L156) |
| `model_hint.startTier?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L156) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L153) |
| <a id="property-prompt"></a> `prompt` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L152) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L159) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L154) |
