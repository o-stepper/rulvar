[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PLAN\_SCOPE

# Variable: PLAN\_SCOPE

```ts
const PLAN_SCOPE: "plan" = 'plan';
```

Defined in: [packages/plan/src/plan-state.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L23)

The single sequential scope holding every plan-mutating entry, inside
the orchestrator's run scope: total order = ordinal
order = durable append order. Child node scopes are `plan/NodeId`
(core `planNodeScope`).
