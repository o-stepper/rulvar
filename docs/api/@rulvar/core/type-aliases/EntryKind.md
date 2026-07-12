[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryKind

# Type Alias: EntryKind

```ts
type EntryKind = 
  | "agent"
  | "step"
  | "child"
  | "external"
  | "approval"
  | "rand"
  | "decision"
  | "plan.revision"
  | "plan.decision"
  | "ledger.op"
  | "resolution"
  | "abandon"
  | "node.link"
  | "termination.init"
  | "termination.denied";
```

Defined in: [packages/core/src/l0/entries.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L28)

The single kinds registry v2.
Readers MUST tolerate unknown kinds; stores pass them through
byte-for-byte (obligation A4).
