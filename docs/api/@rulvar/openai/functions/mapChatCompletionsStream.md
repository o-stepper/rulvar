[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / mapChatCompletionsStream

# Function: mapChatCompletionsStream()

```ts
function mapChatCompletionsStream(
   stream, 
   ids, 
emit): Promise<void>;
```

Defined in: [packages/openai/src/wire.ts:557](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L557)

Delta-patched chunk assembly for the degraded path.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | `AsyncIterable`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt; |
| `ids` | [`OpenAiIdMap`](/api/@rulvar/openai/classes/OpenAiIdMap.md) |
| `emit` | (`event`) => `void` |

## Returns

`Promise`\&lt;`void`\&gt;
