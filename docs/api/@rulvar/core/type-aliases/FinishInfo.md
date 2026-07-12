[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishInfo

# Type Alias: FinishInfo

```ts
type FinishInfo = 
  | {
  reason: "stop";
}
  | {
  reason: "tool-calls";
}
  | {
  reason: "max-tokens";
}
  | {
  reason: "context-window-exceeded";
}
  | {
  reason: "refusal";
  refusal: RefusalInfo;
};
```

Defined in: [packages/core/src/l0/messages.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L163)

Typed finish outcomes. A refusal MUST surface as a typed finish outcome
carrying the provider stop details; it MUST NOT be projected to a null
output silently (docs/04, section "Finish outcomes and typed refusal").
