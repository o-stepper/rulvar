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
  providerMetadata?: Record<string, unknown>;
  type: "error";
};
```

Defined in: `packages/core/dist/index.d.ts`

The single canonical stream-event vocabulary yielded by
ProviderAdapter.stream. Adapters MUST emit exactly one terminal event per
stream (finish or error).

## Union Members

### Type Literal

```ts
{
  text: string;
  type: "text-delta";
}
```

***

### Type Literal

```ts
{
  text: string;
  type: "reasoning-delta";
}
```

***

### Type Literal

```ts
{
  id: CanonicalId;
  name: string;
  type: "tool-call-start";
}
```

***

### Type Literal

```ts
{
  argsTextDelta: string;
  id: CanonicalId;
  type: "tool-call-delta";
}
```

***

### Type Literal

```ts
{
  args: unknown;
  id: CanonicalId;
  type: "tool-call-end";
}
```

***

### Type Literal

```ts
{
  type: "usage";
  usage: Partial<Usage>;
}
```

***

### Type Literal

```ts
{
  finish: FinishInfo;
  providerMetadata?: Record<string, unknown>;
  type: "finish";
  usage: Usage;
}
```

***

### Type Literal

```ts
{
  error: WireError;
  providerMetadata?: Record<string, unknown>;
  type: "error";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `error` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) | - | `packages/core/dist/index.d.ts` |
| `providerMetadata?` | `Record`\&lt;`string`, `unknown`\&gt; | Provenance the adapter already holds when the stream dies (RV401, the eighth comparison experiment): a failed generation is still a billable provider call, and its response id is what joins the reconciliation record to the provider's own statement. Same namespaced shape as the finish event's; absent when the failure predates any provider response. | `packages/core/dist/index.d.ts` |
| `type` | `"error"` | - | `packages/core/dist/index.d.ts` |
