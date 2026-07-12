[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationDecision

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

Defined in: [packages/core/src/runtime/escalation.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L48)
