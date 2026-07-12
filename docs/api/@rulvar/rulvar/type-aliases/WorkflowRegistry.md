[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WorkflowRegistry

# Type Alias: WorkflowRegistry

```ts
type WorkflowRegistry = Record<string, Workflow<never, unknown>>;
```

Defined in: `packages/core/dist/index.d.ts`

The per-engine workflow registry (M5-T01): an
explicit, first-class value; no module-level registry exists. Shells
resolve by-name runs against it; ctx.workflow's string form (M6) and
the queue worker (M8) resolve against it too. CompiledWorkflow values
join the union when they first exist (M6).
