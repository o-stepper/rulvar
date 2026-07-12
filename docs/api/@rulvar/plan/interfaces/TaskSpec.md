[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / TaskSpec

# Interface: TaskSpec

Defined in: [packages/plan/src/task-spec.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L14)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | Registered agent profile name; models are never named here. | [packages/plan/src/task-spec.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L16) |
| <a id="property-approach"></a> `approach?` | `string` | Slug entering approachSig, at most 32 chars after normalization. | [packages/plan/src/task-spec.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L29) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Clamped by childBudgetFraction at admission. | [packages/plan/src/task-spec.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L25) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/rulvar/interfaces/EscalationOptions.md) | Absence means the child cannot escalate (docs/07, 6.4). | [packages/plan/src/task-spec.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L35) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | - | [packages/plan/src/task-spec.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L22) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md) | Absence means a new lineage root (docs/07, 8.1). | [packages/plan/src/task-spec.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L31) |
| <a id="property-model_hint"></a> `model_hint?` | \{ `startTier`: `number`; \} | The ONLY model influence the orchestrator has (docs/07, 4.1). | [packages/plan/src/task-spec.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L27) |
| `model_hint.startTier` | `number` | - | [packages/plan/src/task-spec.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L27) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | Registered SchemaSpec name (docs/08); registry lands in M7-T05. | [packages/plan/src/task-spec.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L19) |
| <a id="property-prompt"></a> `prompt` | `string` | - | [packages/plan/src/task-spec.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L17) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | Default 'unclassified' (taskClass binding OQ, docs/14). | [packages/plan/src/task-spec.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L33) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | Registered tool profile name (docs/08); registry lands in M7-T05. | [packages/plan/src/task-spec.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L21) |
| <a id="property-usagelimits"></a> `usageLimits?` | `Partial`\&lt;[`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md)\&gt; | - | [packages/plan/src/task-spec.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L23) |
