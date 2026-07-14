[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SandboxMethod

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

Defined in: [packages/core/src/runner/sandbox-bridge.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/sandbox-bridge.ts#L34)

Methods a sandbox script may proxy to the host ctx.
