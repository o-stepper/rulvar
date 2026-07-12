[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStatus

# Type Alias: RunStatus

```ts
type RunStatus = 
  | RunOutcome<unknown>["status"]
  | "running";
```

Defined in: [packages/core/src/engine/run-handle.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L60)

Adds 'running' for in-flight inspection (docs/06, section "Engine and ops API").
