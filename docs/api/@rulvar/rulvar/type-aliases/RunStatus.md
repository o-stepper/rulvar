[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunStatus

# Type Alias: RunStatus

```ts
type RunStatus = 
  | RunOutcome<unknown>["status"]
  | "running";
```

Defined in: `packages/core/dist/index.d.ts`

Adds 'running' for in-flight inspection.
