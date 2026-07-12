[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / PlanDiagnostic

# Interface: PlanDiagnostic

Defined in: [packages/planner/src/plan.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L25)

One repair-loop diagnostic: lint and compile findings share the shape.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-column"></a> `column?` | `number` | [packages/planner/src/plan.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L29) |
| <a id="property-line"></a> `line?` | `number` | [packages/planner/src/plan.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L28) |
| <a id="property-message"></a> `message` | `string` | [packages/planner/src/plan.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L27) |
| <a id="property-ruleid"></a> `ruleId` | `string` | [packages/planner/src/plan.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L26) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"warning"` | [packages/planner/src/plan.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L30) |
