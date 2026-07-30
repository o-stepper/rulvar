[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnAgentParams

# Interface: SpawnAgentParams

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L182)

The spawn parameters as validated JSON (a TaskSpec subset).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L183) |
| <a id="property-approach"></a> `approach?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L189) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L187) |
| <a id="property-lineage"></a> `lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} | [packages/core/src/orchestrator/spawn-tools.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L190) |
| `lineage.causeRef` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L190) |
| `lineage.continues` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L190) |
| `lineage.relation?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L190) |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier?`: `number`; \} | [packages/core/src/orchestrator/spawn-tools.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L188) |
| `model_hint.startTier?` | `number` | [packages/core/src/orchestrator/spawn-tools.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L188) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L185) |
| <a id="property-prompt"></a> `prompt` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L184) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L191) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | [packages/core/src/orchestrator/spawn-tools.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L186) |
