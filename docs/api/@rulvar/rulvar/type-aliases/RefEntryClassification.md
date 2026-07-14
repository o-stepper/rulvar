[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RefEntryClassification

# Type Alias: RefEntryClassification

```ts
type RefEntryClassification = 
  | {
  classification: "applied";
}
  | {
  classification: "noop";
  reason: "already_resolved" | "target_abandoned";
  supersededBy: number;
}
  | {
  classification: "invalid";
  detail: string;
};
```

Defined in: `packages/core/dist/index.d.ts`

Fold classification of one ref-entry; NEVER persisted.
