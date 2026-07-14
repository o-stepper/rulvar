[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / rebasePlanRevision

# Function: rebasePlanRevision()

```ts
function rebasePlanRevision(request, context): RebaseEvaluation;
```

Defined in: [packages/plan/src/rebase.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L89)

Steps 2-4 of the committed algorithm: base validation,
sequential per-op conflict resolution against the mutating head, and
the post-revision counter update. Pure: the caller owns the lock, the
append, and every effect.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`PlanReviseRequest`](/api/@rulvar/plan/interfaces/PlanReviseRequest.md) |
| `context` | [`RebaseContext`](/api/@rulvar/plan/interfaces/RebaseContext.md) |

## Returns

[`RebaseEvaluation`](/api/@rulvar/plan/interfaces/RebaseEvaluation.md)
