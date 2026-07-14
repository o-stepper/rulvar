[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / ResponsesStreamEvent

# Type Alias: ResponsesStreamEvent

```ts
type ResponsesStreamEvent = Record<string, unknown> & {
  type: string;
};
```

Defined in: [packages/openai/src/wire.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L238)

Raw Responses SSE events, structurally typed.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `type` | `string` | [packages/openai/src/wire.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L238) |
