[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / applyAppliedOp

# Function: applyAppliedOp()

```ts
function applyAppliedOp(
   working, 
   op, 
   context): PlanWorking;
```

Defined in: [packages/plan/src/plan-entries.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L337)

Applies ONE applied op to the working state. The applier consumes
recorded outcomes; op-level legality was decided at rebase time and is
never re-evaluated here. Exported for the rebase engine, which applies
each op of a revision against the state already changed by the earlier
applied ops of the same revision.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `working` | [`PlanWorking`](/api/@rulvar/plan/interfaces/PlanWorking.md) |
| `op` | [`AppliedPlanOp`](/api/@rulvar/plan/type-aliases/AppliedPlanOp.md) |
| `context` | \{ `lineageOf?`: (`opIndex`) => `string` \| `undefined`; `opIndex?`: `number`; `seq`: `number`; \} |
| `context.lineageOf?` | (`opIndex`) => `string` \| `undefined` |
| `context.opIndex?` | `number` |
| `context.seq` | `number` |

## Returns

[`PlanWorking`](/api/@rulvar/plan/interfaces/PlanWorking.md)
