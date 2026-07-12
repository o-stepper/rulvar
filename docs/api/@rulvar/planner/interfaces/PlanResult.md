[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / PlanResult

# Interface: PlanResult

Defined in: [packages/planner/src/plan.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L42)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-lint"></a> `lint` | [`PlanDiagnostic`](/api/@rulvar/planner/interfaces/PlanDiagnostic.md)[] | Diagnostics of the ACCEPTED draft: advisories only, never errors. | [packages/planner/src/plan.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L46) |
| <a id="property-source"></a> `source` | `string` | - | [packages/planner/src/plan.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L43) |
| <a id="property-workflow"></a> `workflow` | [`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md) | - | [packages/planner/src/plan.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L44) |
