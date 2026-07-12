[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RefEntryClassification

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

Defined in: [packages/core/src/journal/resolution.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L53)

Fold classification of one ref-entry; NEVER persisted (docs/03, section 8.4).
