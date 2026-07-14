[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Settled

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

Defined in: `packages/core/dist/index.d.ts`

The discriminated union over AgentStatus carrying the underlying
AgentResult where one exists.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
