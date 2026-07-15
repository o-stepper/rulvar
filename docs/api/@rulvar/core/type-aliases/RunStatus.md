[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStatus

# Type Alias: RunStatus

```ts
type RunStatus = 
  | RunOutcome<unknown>["status"]
  | "running";
```

Defined in: [packages/core/src/engine/run-handle.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L66)

Adds 'running' for in-flight inspection.
