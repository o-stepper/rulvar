[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / RunPlannedOptions

# Interface: RunPlannedOptions

Defined in: [packages/planner/src/plan.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L67)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-plan"></a> `plan?` | [`PlanOptions`](/api/@rulvar/planner/interfaces/PlanOptions.md) | Options of the planning conversation (see plan()). | [packages/planner/src/plan.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L69) |
| <a id="property-run"></a> `run?` | [`RunOptions`](/api/@rulvar/rulvar/interfaces/RunOptions.md) | RunOptions of the generated workflow's execution run, passed to engine.run verbatim (budgetUsd here is the EXECUTION ceiling, independent of the planning ceiling). Absent, the execution run is UNBOUNDED, as before. | [packages/planner/src/plan.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L76) |
