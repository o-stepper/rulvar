[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RefEntryClassification

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

Defined in: [packages/core/src/journal/resolution.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L52)

Fold classification of one ref-entry; NEVER persisted.
