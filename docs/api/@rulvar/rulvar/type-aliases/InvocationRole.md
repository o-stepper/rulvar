[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InvocationRole

# Type Alias: InvocationRole

```ts
type InvocationRole = 
  | "orchestrate"
  | "plan"
  | "loop"
  | "finalize"
  | "extract"
  | "summarize"
  | "synthesize";
```

Defined in: `packages/core/dist/index.d.ts`

The seven invocation roles. 'synthesize' is the orchestrator's
post-fan-in synthesis invocation (RV-211): it fires only when
OrchestrateOptions.synthesis is configured, and the routing key picks
its model like any other role without ever summoning it.
