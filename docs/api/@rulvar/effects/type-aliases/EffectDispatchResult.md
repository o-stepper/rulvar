[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectDispatchResult

# Type Alias: EffectDispatchResult

```ts
type EffectDispatchResult = 
  | {
  outcome: "accepted";
  providerRef?: string;
  receipt?: EffectReceiptObservation;
}
  | {
  detail: string;
  outcome: "failed";
}
  | {
  detail?: string;
  outcome: "unknown";
};
```

Defined in: [packages/effects/src/adapter.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L59)

## Union Members

### Type Literal

```ts
{
  outcome: "accepted";
  providerRef?: string;
  receipt?: EffectReceiptObservation;
}
```

***

### Type Literal

```ts
{
  detail: string;
  outcome: "failed";
}
```

'failed' MUST mean provably not executed (a classified refusal).

***

### Type Literal

```ts
{
  detail?: string;
  outcome: "unknown";
}
```
