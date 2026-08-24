[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectRecoveryReport

# Type Alias: EffectRecoveryReport

```ts
type EffectRecoveryReport = 
  | {
  kind: "noop";
  reason: string;
}
  | {
  kind: "cancelled";
  terminalSeq: number;
}
  | {
  kind: "confirmed";
  receiptSeq: number;
  terminalSeq: number;
}
  | {
  kind: "quarantined";
  reason: string;
  terminalSeq: number;
}
  | {
  kind: "redispatched";
  report: EffectDispatchReport;
}
  | {
  kind: "waiting";
  reason: string;
}
  | {
  kind: "receipt-unverified";
  receiptSeq: number;
};
```

Defined in: [packages/effects/src/dispatcher.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L63)
