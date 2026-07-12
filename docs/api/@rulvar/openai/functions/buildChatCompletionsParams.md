[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / buildChatCompletionsParams

# Function: buildChatCompletionsParams()

```ts
function buildChatCompletionsParams(req, ids): Record<string, unknown>;
```

Defined in: [packages/openai/src/wire.ts:458](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L458)

The Chat Completions degraded path: delta-patched
chunk assembly instead of typed SSE, nested function tools with explicit
strict where supported, response_format instead of text.format, no
reasoning item replay. Selected by caps (api: 'chat'), visible in
events, never silent.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `ids` | [`OpenAiIdMap`](/api/@rulvar/openai/classes/OpenAiIdMap.md) |

## Returns

`Record`\&lt;`string`, `unknown`\&gt;
