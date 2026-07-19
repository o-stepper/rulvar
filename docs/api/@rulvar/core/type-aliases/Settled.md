[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Settled

# Type Alias: Settled\&lt;T\&gt;

```ts
type Settled<T> = 
  | {
  result?: AgentResult<unknown>;
  status: "ok";
  value: T;
}
  | {
  error: WireError;
  result?: AgentResult<unknown>;
  status: "error";
}
  | {
  result: AgentResult<unknown>;
  status: "limit";
}
  | {
  result?: AgentResult<unknown>;
  status: "cancelled";
}
  | {
  result: AgentResult<unknown>;
  status: "skipped";
}
  | {
  result: EscalatedResult<unknown>;
  status: "escalated";
};
```

Defined in: [packages/core/src/engine/ctx.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L233)

The discriminated union over AgentStatus carrying the underlying
AgentResult where one exists.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
