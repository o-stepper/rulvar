[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / readPlanDecision

# Function: readPlanDecision()

```ts
function readPlanDecision(entry): 
  | PlanDecisionValue
  | undefined;
```

Defined in: [packages/plan/src/plan-entries.ts:448](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L448)

Reads a plan.decision entry's payload.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

  \| [`PlanDecisionValue`](/api/@rulvar/plan/interfaces/PlanDecisionValue.md)
  \| `undefined`
