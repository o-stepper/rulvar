[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectVoidReason

# Type Alias: EffectVoidReason

```ts
type EffectVoidReason = 
  | "no-epoch"
  | "stale-epoch"
  | "no-such-approval"
  | "approval-not-allowed"
  | "approval-revoked"
  | "approval-expired"
  | "approval-names-no-key"
  | "approval-key-mismatch"
  | "duplicate-logical-key"
  | "compensation-depth"
  | "bad-causal-ref";
```

Defined in: [packages/core/src/effects/fold.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L57)

Why a consumption fold refused an intent (RFC section 4.3).
