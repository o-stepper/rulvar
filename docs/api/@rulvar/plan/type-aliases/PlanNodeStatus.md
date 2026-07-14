[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanNodeStatus

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

Defined in: [packages/plan/src/plan-state.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L29)

The closed status machine; `skipped` is fold-derived for entries but
first-class for plan nodes.
