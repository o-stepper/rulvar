[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceReconciliation

# Type Alias: InvoiceReconciliation

```ts
type InvoiceReconciliation = "matched" | "missing-provider-id" | "unconfirmed" | "unattributed";
```

Defined in: [packages/core/src/engine/invoice.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L33)

How a row lines up against a provider invoice.
