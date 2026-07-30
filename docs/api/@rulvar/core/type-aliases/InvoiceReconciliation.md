[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceReconciliation

# Type Alias: InvoiceReconciliation

```ts
type InvoiceReconciliation = 
  | "provider-id-present"
  | "missing-provider-id"
  | "unconfirmed"
  | "unattributed";
```

Defined in: [packages/core/src/engine/invoice.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L65)

How far a row's identity goes toward provider-side reconciliation.
`provider-id-present` asserts exactly what it names: the adapter
surfaced the provider's response id for this call, the join key a
host needs to line the row up against a provider statement. It does
NOT assert any statement, amount, or usage match: the library never
sees provider billing data, so those deeper reconciliation tiers are
host-side joins keyed on `responseId`, not verdicts this export can
make.
