[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / readPlanRevision

# Function: readPlanRevision()

```ts
function readPlanRevision(entry): 
  | PlanRevisionValue
  | undefined;
```

Defined in: [packages/plan/src/plan-entries.ts:427](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L427)

Reads a plan.revision entry's payload (tolerant of foreign journals).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

  \| [`PlanRevisionValue`](/api/@rulvar/plan/interfaces/PlanRevisionValue.md)
  \| `undefined`
