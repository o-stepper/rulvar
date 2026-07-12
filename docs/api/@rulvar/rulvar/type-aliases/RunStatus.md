[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunStatus

# Type Alias: RunStatus

```ts
type RunStatus = 
  | RunOutcome<unknown>["status"]
  | "running";
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Adds 'running' for in-flight inspection (docs/06, section "Engine and ops API").
