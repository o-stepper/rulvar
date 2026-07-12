[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / assertPlanHead

# Function: assertPlanHead()

```ts
function assertPlanHead(
   plan, 
   expectedPlanHash, 
   context?): void;
```

Defined in: [packages/plan/src/plan-hash.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-hash.ts#L75)

The append-time head assertion (docs/07, 3.4): planHashBefore of the
entry being appended MUST equal the current fold head. A failure is an
engine bug and raises the typed PlanInvariantError; the run finishes
with outcome error, never a silent brick.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) |
| `expectedPlanHash` | `string` |
| `context?` | \{ `entryRef?`: `number`; `operation?`: `string`; \} |
| `context.entryRef?` | `number` |
| `context.operation?` | `string` |

## Returns

`void`
