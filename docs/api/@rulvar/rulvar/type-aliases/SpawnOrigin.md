[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpawnOrigin

# Type Alias: SpawnOrigin

```ts
type SpawnOrigin = 
  | "ctx.workflow"
  | "ctx.orchestrate"
  | "spawn_agent"
  | "parallel_agents"
  | "escalation-decomposition"
  | "rung-respawn"
  | "reuse-link";
```

Defined in: `packages/core/dist/index.d.ts`

Every spawn origin routed through the single admission point.
