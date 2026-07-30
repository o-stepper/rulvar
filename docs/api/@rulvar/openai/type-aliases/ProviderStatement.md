[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / ProviderStatement

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

Defined in: [packages/openai/src/reconcile.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L64)

A normalized provider export: never a headline total.
