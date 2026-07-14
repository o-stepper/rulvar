[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / TaskSpec

# Interface: TaskSpec

Defined in: [packages/plan/src/task-spec.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L13)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | Registered agent profile name; models are never named here. | [packages/plan/src/task-spec.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L15) |
| <a id="property-approach"></a> `approach?` | `string` | Slug entering approachSig, at most 32 chars after normalization. | [packages/plan/src/task-spec.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L28) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Clamped by childBudgetFraction at admission. | [packages/plan/src/task-spec.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L24) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/rulvar/interfaces/EscalationOptions.md) | Absence means the child cannot escalate. | [packages/plan/src/task-spec.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L34) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | - | [packages/plan/src/task-spec.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L21) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md) | Absence means a new lineage root. | [packages/plan/src/task-spec.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L30) |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier`: `number`; \} | The ONLY model influence the orchestrator has. | [packages/plan/src/task-spec.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L26) |
| `model_hint.startTier` | `number` | - | [packages/plan/src/task-spec.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L26) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | Registered SchemaSpec name; registry lands in M7-T05. | [packages/plan/src/task-spec.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L18) |
| <a id="property-prompt"></a> `prompt` | `string` | - | [packages/plan/src/task-spec.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L16) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | Default 'unclassified' (taskClass binding is an open question). | [packages/plan/src/task-spec.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L32) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | Registered tool profile name; registry lands in M7-T05. | [packages/plan/src/task-spec.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L20) |
| <a id="property-usagelimits"></a> `usageLimits?` | `Partial`\&lt;[`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md)\&gt; | - | [packages/plan/src/task-spec.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L22) |
