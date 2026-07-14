[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ChatEvent

# Type Alias: ChatEvent

```ts
type ChatEvent = 
  | {
  text: string;
  type: "text-delta";
}
  | {
  text: string;
  type: "reasoning-delta";
}
  | {
  id: CanonicalId;
  name: string;
  type: "tool-call-start";
}
  | {
  argsTextDelta: string;
  id: CanonicalId;
  type: "tool-call-delta";
}
  | {
  args: unknown;
  id: CanonicalId;
  type: "tool-call-end";
}
  | {
  type: "usage";
  usage: Partial<Usage>;
}
  | {
  finish: FinishInfo;
  providerMetadata?: Record<string, unknown>;
  type: "finish";
  usage: Usage;
}
  | {
  error: WireError;
  type: "error";
};
```

Defined in: `packages/core/dist/index.d.ts`

The single canonical stream-event vocabulary yielded by
ProviderAdapter.stream. Adapters MUST emit exactly one terminal event per
stream (finish or error).
