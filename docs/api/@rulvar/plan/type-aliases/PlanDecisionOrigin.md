[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanDecisionOrigin

# Type Alias: PlanDecisionOrigin

```ts
type PlanDecisionOrigin = 
  | "escalation-default"
  | "escalation-class"
  | "escalation-live"
  | "no-progress"
  | "child-result"
  | "park-landed"
  | "cancel-landed"
  | "dispatch-rejected";
```

Defined in: [packages/plan/src/plan-entries.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L175)

Engine authorship origins of plan.decision entries.
