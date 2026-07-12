[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AttemptOutcomeClass

# Type Alias: AttemptOutcomeClass

```ts
type AttemptOutcomeClass = 
  | "ok"
  | "escalated"
  | "task-error"
  | "transient-error"
  | "no-progress"
  | "verify-failed"
  | "limit"
  | "abandoned";
```

Defined in: `packages/core/dist/index.d.ts`

Attempt outcome classes entering LineageStats.
