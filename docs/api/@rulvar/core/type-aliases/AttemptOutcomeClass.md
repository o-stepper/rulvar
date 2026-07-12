[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AttemptOutcomeClass

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

Defined in: [packages/core/src/journal/lineage.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L67)

Attempt outcome classes entering LineageStats.
