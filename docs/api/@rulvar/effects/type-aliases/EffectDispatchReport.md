[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectDispatchReport

# Type Alias: EffectDispatchReport

```ts
type EffectDispatchReport = 
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
  attemptSeq: number;
  kind: "accepted-awaiting-receipt";
}
  | {
  attemptSeq: number;
  kind: "receipt-unverified";
  receiptSeq: number;
}
  | {
  attemptSeq: number;
  detail: string;
  kind: "failed";
}
  | {
  attemptSeq: number;
  detail?: string;
  kind: "unknown";
};
```

Defined in: [packages/effects/src/dispatcher.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L55)
