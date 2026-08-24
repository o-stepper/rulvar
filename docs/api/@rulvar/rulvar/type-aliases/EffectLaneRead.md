[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectLaneRead

# Type Alias: EffectLaneRead

```ts
type EffectLaneRead = 
  | {
  lane: false;
}
  | {
  decision: EffectLaneDecision;
  lane: true;
}
  | {
  lane: true;
  malformed: string;
};
```

Defined in: `packages/core/dist/index.d.ts`

The read verdict of one journal entry against the lane vocabulary.
