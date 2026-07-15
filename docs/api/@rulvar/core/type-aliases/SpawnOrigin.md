[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnOrigin

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

Defined in: [packages/core/src/orchestrator/admission.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L126)

Every spawn origin routed through the single admission point.
