[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / ReceiptVerification

# Type Alias: ReceiptVerification

```ts
type ReceiptVerification = 
  | {
  verification: "verified";
}
  | {
  reason: string;
  verification: "unverified";
};
```

Defined in: [packages/effects/src/receipts.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L38)
