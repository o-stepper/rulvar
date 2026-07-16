[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / PlanOptions

# Interface: PlanOptions

Defined in: [packages/planner/src/plan.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L40)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | The planner model; otherwise the chain resolves role 'plan'. | [packages/planner/src/plan.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L42) |
| <a id="property-profiles"></a> `profiles?` | `string`[] | Registered profile names to advertise; default: every profile. | [packages/planner/src/plan.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L44) |
| <a id="property-repairrounds"></a> `repairRounds?` | `number` | Self-repair rounds from JSON diagnostics; default 3 (Appendix A). | [packages/planner/src/plan.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L46) |
| <a id="property-run"></a> `run?` | `Pick`\&lt;[`RunOptions`](/api/@rulvar/rulvar/interfaces/RunOptions.md), `"budgetUsd"` \| `"limits"` \| `"deadlineAt"` \| `"signal"`\&gt; | Run options of the planning conversation itself, applied at GENESIS only: the first plan() of a goal starts the journal with them, and budgetUsd becomes the run's immutable ceiling B0, recorded in RunMeta. A later plan() of the same goal resumes the existing journal under its RECORDED ceiling: a differing explicit budgetUsd warns (RULVAR_PLAN_BUDGET_DRIFT) and never tops up or replaces the frozen value, and limits/deadlineAt/signal do not apply to a resumed journal (core resume semantics; cancel through the handle). The runId stays goal-derived (planRunIdOf) and is not overridable. Absent options, the planning run is UNBOUNDED, as before. | [packages/planner/src/plan.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L59) |
