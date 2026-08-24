[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectLaneClassification

# Type Alias: EffectLaneClassification

```ts
type EffectLaneClassification = 
  | {
  classification: "applied";
}
  | {
  classification: "replay";
  firstSeq: number;
}
  | {
  classification: "void";
  detail: string;
  reason: EffectVoidReason;
}
  | {
  classification: "superseded";
  supersededBy: number;
}
  | {
  classification: "incident";
  detail: string;
  intentRef: number;
}
  | {
  classification: "invalid";
  detail: string;
}
  | {
  classification: "malformed";
  detail: string;
};
```

Defined in: `packages/core/dist/index.d.ts`

Fold classification of one lane entry; NEVER persisted.
