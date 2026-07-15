[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RebaseOutcome

# Type Alias: RebaseOutcome

```ts
type RebaseOutcome = 
  | {
  kind: "applied";
  op: AppliedPlanOp;
}
  | {
  applied: AppliedPlanOp;
  kind: "transformed";
  reason: RebaseReasonCode;
  requested: PlanOp;
}
  | {
  blockingRef?: EntryRef;
  kind: "dropped";
  reason: RebaseReasonCode;
  requested: PlanOp;
};
```

Defined in: [packages/plan/src/plan-entries.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L110)
