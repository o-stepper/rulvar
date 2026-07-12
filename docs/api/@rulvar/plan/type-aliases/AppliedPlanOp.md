[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / AppliedPlanOp

# Type Alias: AppliedPlanOp

```ts
type AppliedPlanOp = 
  | Extract<PlanOp, {
  op: "add_task";
}> & {
  nodeId: NodeId;
}
  | Extract<PlanOp, {
  op: "amend_task";
}>
  | {
  nodeId: NodeId;
  op: "park_task";
  requestOnly?: boolean;
}
  | {
  nodeId: NodeId;
  op: "unpark_task";
  restart?: boolean;
}
  | {
  cascadeNodeIds?: NodeId[];
  nodeId: NodeId;
  op: "cancel_task";
  reason?: string;
  requestOnly?: boolean;
}
  | Extract<PlanOp, {
  op: "reprioritize";
}>
  | {
  deps: NodeId[];
  nodeId: NodeId;
  op: "rewire_deps";
}
  | Extract<PlanOp, {
  op: "waive_dep";
}>;
```

Defined in: [packages/plan/src/plan-entries.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L70)

Applied forms the fold consumes. cancel_task gains the engine-computed
cascade (computed at apply time, never a parameter);
park/cancel against running nodes apply as flag requests landing later
via plan.decision (park-landed, cancel-landed).
