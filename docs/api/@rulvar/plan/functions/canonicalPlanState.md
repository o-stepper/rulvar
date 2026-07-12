[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / canonicalPlanState

# Function: canonicalPlanState()

```ts
function canonicalPlanState(plan): Record<string, unknown>;
```

Defined in: [packages/plan/src/plan-hash.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-hash.ts#L48)

The canonical JSON projection of PlanState: nodes sorted by NodeId plus
the guard fold counters, nothing else.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) |

## Returns

`Record`\&lt;`string`, `unknown`\&gt;
