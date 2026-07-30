[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChatEvent

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

Defined in: [packages/core/src/l0/messages.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L180)

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
| `error` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/l0/messages.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L190) |
| `providerMetadata?` | `Record`\&lt;`string`, `unknown`\&gt; | Provenance the adapter already holds when the stream dies (RV401, the eighth comparison experiment): a failed generation is still a billable provider call, and its response id is what joins the reconciliation record to the provider's own statement. Same namespaced shape as the finish event's; absent when the failure predates any provider response. | [packages/core/src/l0/messages.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L199) |
| `type` | `"error"` | - | [packages/core/src/l0/messages.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L189) |
