[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EntryStatus

# Type Alias: EntryStatus

```ts
type EntryStatus = 
  | "running"
  | "ok"
  | "error"
  | "limit"
  | "suspended"
  | "cancelled"
  | "escalated";
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The stored status vocabulary, exactly. 'skipped' is DELIBERATELY absent:
it is a derived fold status, never persisted (docs/03, section "Stored
status vocabulary").
