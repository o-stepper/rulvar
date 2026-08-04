[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ProviderStatement

# Type Alias: ProviderStatement

```ts
type ProviderStatement = 
  | {
  kind: "requests";
  rows: readonly StatementRequestRow[];
}
  | {
  kind: "categories";
  rows: readonly StatementCategoryRow[];
};
```

Defined in: [packages/core/src/engine/reconcile-statement.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L76)

A normalized provider export: never a headline total.
