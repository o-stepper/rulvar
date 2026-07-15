[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanWorking

# Interface: PlanWorking

Defined in: [packages/plan/src/plan-entries.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L255)

The working state the applier threads: the hashed TaskPlan plus the
resolved spec table. Specs stay OUT of planHash by construction (the
hashed projection is promptSpecHash per node) but are
themselves a pure fold of add_task specs, amend patches, and
decomposition specs, so live and replay converge byte-identically.

## Extended by

- [`PlanFoldState`](/api/@rulvar/plan/interfaces/PlanFoldState.md)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-plan"></a> `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) | [packages/plan/src/plan-entries.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L256) |
| <a id="property-specs"></a> `specs` | `Readonly`\&lt;`Record`\&lt;[`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md), [`TaskSpec`](/api/@rulvar/plan/interfaces/TaskSpec.md)\&gt;\&gt; | [packages/plan/src/plan-entries.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L257) |
