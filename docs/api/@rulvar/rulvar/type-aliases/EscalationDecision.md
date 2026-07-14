[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EscalationDecision

# Type Alias: EscalationDecision

```ts
type EscalationDecision = 
  | {
  amendedPrompt?: string;
  kind: "retry";
  startTier?: number;
}
  | {
  children: TaskSpec[];
  kind: "decompose";
}
  | {
  kind: "cancel";
  reason?: string;
}
  | {
  kind: "accept";
  note?: string;
};
```

Defined in: `packages/core/dist/index.d.ts`
