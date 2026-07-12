[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SandboxMethod

# Type Alias: SandboxMethod

```ts
type SandboxMethod = 
  | "agent"
  | "step"
  | "workflow"
  | "awaitExternal"
  | "parallel"
  | "pipeline"
  | "phase"
  | "budget.spent"
  | "budget.remaining";
```

Defined in: `packages/core/dist/index.d.ts`

Methods a sandbox script may proxy to the host ctx.
