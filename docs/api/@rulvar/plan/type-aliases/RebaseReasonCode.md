[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RebaseReasonCode

# Type Alias: RebaseReasonCode

```ts
type RebaseReasonCode = 
  | "admission_denied"
  | "node_already_done"
  | "dep_already_resolved"
  | "node_escalated"
  | "node_running"
  | "terminal_status"
  | "dep_cycle"
  | "already_parked"
  | "not_parked"
  | "no_such_dep"
  | "already_waived"
  | "bad_base"
  | "lineage_exhausted"
  | "lineage_busy"
  | "plan_frozen"
  | "checkpoint_discarded"
  | "reuse_by_reference"
  | "resolved_escalation"
  | "immediate_satisfaction";
```

Defined in: [packages/plan/src/plan-entries.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L87)

The complete machine reason vocabulary, normative and closed.
