[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryStatus

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

Defined in: [packages/core/src/l0/entries.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L49)

The stored status vocabulary, exactly. 'skipped' is DELIBERATELY absent:
it is a derived fold status, never persisted.
