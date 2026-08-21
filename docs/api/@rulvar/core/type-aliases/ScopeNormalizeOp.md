[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ScopeNormalizeOp

# Type Alias: ScopeNormalizeOp

```ts
type ScopeNormalizeOp = "trim" | "lowercase" | "nfc";
```

Defined in: [packages/core/src/engine/engine.ts:870](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L870)

One value-normalization operation of the declarative table (RV4302):
a CLOSED vocabulary on purpose. A host callback would not be replay
stable (it is not journalable, and it may read locale or time), so
the policy is data: each operation is a named pure function of the
string alone, all three idempotent, applied in the declared order.
