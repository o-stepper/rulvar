[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanNodeStatus

# Type Alias: PlanNodeStatus

```ts
type PlanNodeStatus = 
  | "pending"
  | "ready"
  | "running"
  | "parked"
  | "escalated"
  | "done"
  | "failed"
  | "cancelled"
  | "skipped";
```

Defined in: [packages/plan/src/plan-state.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L26)

The closed status machine (docs/07, 3.1); `skipped` is fold-derived for entries but first-class for plan nodes.
