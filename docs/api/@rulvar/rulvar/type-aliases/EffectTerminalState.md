[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectTerminalState

# Type Alias: EffectTerminalState

```ts
type EffectTerminalState = 
  | "confirmed"
  | "quarantined"
  | "cancelled-before-dispatch"
  | "compensated"
  | "refused";
```

Defined in: `packages/core/dist/index.d.ts`

The five appendable terminal states (RFC section 4.6).
