[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProviderStatement

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

Defined in: `packages/core/dist/index.d.ts`

A normalized provider export: never a headline total.
