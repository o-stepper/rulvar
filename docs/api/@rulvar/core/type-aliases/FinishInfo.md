[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishInfo

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

Defined in: [packages/core/src/l0/messages.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L156)

Typed finish outcomes. A refusal MUST surface as a typed finish outcome
carrying the provider stop details; it MUST NOT be projected to a null
output silently.
