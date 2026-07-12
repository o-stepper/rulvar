[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / depsSatisfied

# Function: depsSatisfied()

```ts
function depsSatisfied(plan, node): boolean;
```

Defined in: [packages/plan/src/plan-state.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L144)

Dependency satisfaction, derived purely in the fold and NEVER a record:
a dep is satisfied when waived or when its upstream
node is `done`. Terminally unsuccessful upstreams (cancelled, failed)
keep blocking: such edges "remain blocking" per the rewire_deps row of
the conflict table, and waive_dep exists exactly to unblock them.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) |
| `node` | [`PlanNode`](/api/@rulvar/plan/interfaces/PlanNode.md) |

## Returns

`boolean`
