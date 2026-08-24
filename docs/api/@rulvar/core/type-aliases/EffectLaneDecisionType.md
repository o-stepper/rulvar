[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneDecisionType

# Type Alias: EffectLaneDecisionType

```ts
type EffectLaneDecisionType = 
  | "effect_epoch"
  | "effect_declared"
  | "effect_intent"
  | "effect_attempt"
  | "effect_outcome"
  | "effect_receipt"
  | "effect_terminal"
  | "effect_incident"
  | "effect_disposition"
  | "effect_probe"
  | "effect_reconciliation_complete";
```

Defined in: [packages/core/src/effects/types.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L74)

The lane's decisionType discriminators, exactly.
