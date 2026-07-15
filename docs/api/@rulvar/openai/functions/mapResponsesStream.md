[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / mapResponsesStream

# Function: mapResponsesStream()

```ts
function mapResponsesStream(
   stream, 
   ids, 
options?): AsyncGenerator<ChatEvent, void>;
```

Defined in: [packages/openai/src/wire.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L268)

Maps the typed Responses SSE stream to ChatEvents, yielding each
canonical event AS the corresponding provider event is consumed: the
consumer's pull drives the provider read (natural backpressure, no
buffering, no detached work). Canonical parts come from the typed
output array, never the output_text aggregate. Raw output items ride
finish.providerMetadata.openai.outputItems so the runtime can retain
reasoning items as provider-raw parts.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | `AsyncIterable`\&lt;[`ResponsesStreamEvent`](/api/@rulvar/openai/type-aliases/ResponsesStreamEvent.md)\&gt; |
| `ids` | [`OpenAiIdMap`](/api/@rulvar/openai/classes/OpenAiIdMap.md) |
| `options?` | \{ `effortDownmapped?`: `boolean`; \} |
| `options.effortDownmapped?` | `boolean` |

## Returns

`AsyncGenerator`\&lt;[`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md), `void`\&gt;
