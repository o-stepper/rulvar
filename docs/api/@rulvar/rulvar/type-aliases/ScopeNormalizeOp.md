[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ScopeNormalizeOp

# Type Alias: ScopeNormalizeOp

```ts
type ScopeNormalizeOp = "trim" | "lowercase" | "nfc";
```

Defined in: `packages/core/dist/index.d.ts`

One value-normalization operation of the declarative table (RV4302):
a CLOSED vocabulary on purpose. A host callback would not be replay
stable (it is not journalable, and it may read locale or time), so
the policy is data: each operation is a named pure function of the
string alone, all three idempotent, applied in the declared order.
