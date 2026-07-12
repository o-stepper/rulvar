[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / recomputePlanReadiness

# Function: recomputePlanReadiness()

```ts
function recomputePlanReadiness(plan): TaskPlan;
```

Defined in: [packages/plan/src/plan-state.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L154)

Recomputes the derived pending/ready boundary after a fold step: every
schedulable node (currently pending or ready) becomes `ready` when its
deps are satisfied and `pending` otherwise. rewire_deps may regress a
ready node to pending; upstream `done` transitions and waives promote
pending to ready. All other statuses are untouched. Returns the same
plan object when nothing changed, so fold steps stay cheap.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) |

## Returns

[`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md)
