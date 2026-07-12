[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EntryKind

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The single kinds registry v2 (docs/03, section "Kinds registry v2").
Readers MUST tolerate unknown kinds; stores pass them through
byte-for-byte (obligation A4).
