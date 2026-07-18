[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / mapChatCompletionsStream

# Function: mapChatCompletionsStream()

```ts
function mapChatCompletionsStream(stream, ids): AsyncGenerator<ChatEvent, void>;
```

Defined in: [packages/openai/src/wire.ts:563](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L563)

Delta-patched chunk assembly for the degraded path; yields each
canonical event as its chunk is consumed (same live-streaming contract
as mapResponsesStream).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | `AsyncIterable`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt; |
| `ids` | [`OpenAiIdMap`](/api/@rulvar/openai/classes/OpenAiIdMap.md) |

## Returns

`AsyncGenerator`\&lt;[`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md), `void`\&gt;
