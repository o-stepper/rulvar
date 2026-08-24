[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneRead

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

Defined in: [packages/core/src/effects/types.ts:365](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L365)

The read verdict of one journal entry against the lane vocabulary.
