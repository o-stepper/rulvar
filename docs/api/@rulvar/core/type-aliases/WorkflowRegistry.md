[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WorkflowRegistry

# Type Alias: WorkflowRegistry

```ts
type WorkflowRegistry = Record<string, Workflow<never, unknown>>;
```

Defined in: [packages/core/src/engine/engine.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L82)

The per-engine workflow registry (M5-T01): an
explicit, first-class value; no module-level registry exists. Shells
resolve by-name runs against it; ctx.workflow's string form (M6) and
the queue worker (M8) resolve against it too. CompiledWorkflow values
join the union when they first exist (M6).
