[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / PlanDiagnostic

# Interface: PlanDiagnostic

Defined in: [packages/planner/src/plan.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L32)

One repair-loop diagnostic: lint and compile findings share the shape.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-column"></a> `column?` | `number` | [packages/planner/src/plan.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L36) |
| <a id="property-line"></a> `line?` | `number` | [packages/planner/src/plan.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L35) |
| <a id="property-message"></a> `message` | `string` | [packages/planner/src/plan.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L34) |
| <a id="property-ruleid"></a> `ruleId` | `string` | [packages/planner/src/plan.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L33) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"warning"` | [packages/planner/src/plan.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L37) |
