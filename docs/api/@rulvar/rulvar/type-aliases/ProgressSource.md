[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressSource

# Type Alias: ProgressSource

```ts
type ProgressSource = 
  | RunHandle<unknown>
  | Promise<RunHandle<unknown>>
| AsyncIterable<WorkflowEvent>;
```

Defined in: [packages/rulvar/src/live-progress.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L81)
