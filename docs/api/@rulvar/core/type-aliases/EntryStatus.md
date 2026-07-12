[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryStatus

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

Defined in: [packages/core/src/l0/entries.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L51)

The stored status vocabulary, exactly. 'skipped' is DELIBERATELY absent:
it is a derived fold status, never persisted (docs/03, section "Stored
status vocabulary").
