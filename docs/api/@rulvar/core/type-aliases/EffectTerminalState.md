[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectTerminalState

# Type Alias: EffectTerminalState

```ts
type EffectTerminalState = 
  | "confirmed"
  | "quarantined"
  | "cancelled-before-dispatch"
  | "compensated"
  | "refused";
```

Defined in: [packages/core/src/effects/types.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L39)

The five appendable terminal states (RFC section 4.6).
