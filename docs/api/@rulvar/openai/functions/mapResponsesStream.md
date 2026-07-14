[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / mapResponsesStream

# Function: mapResponsesStream()

```ts
function mapResponsesStream(
   stream, 
   ids, 
   emit, 
options?): Promise<void>;
```

Defined in: [packages/openai/src/wire.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L266)

Maps the typed Responses SSE stream to ChatEvents.
Canonical parts come from the typed output array,
never the output_text aggregate. Raw output items ride
finish.providerMetadata.openai.outputItems so the runtime can retain
reasoning items as provider-raw parts.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | `AsyncIterable`\&lt;[`ResponsesStreamEvent`](/api/@rulvar/openai/type-aliases/ResponsesStreamEvent.md)\&gt; |
| `ids` | [`OpenAiIdMap`](/api/@rulvar/openai/classes/OpenAiIdMap.md) |
| `emit` | (`event`) => `void` |
| `options?` | \{ `effortDownmapped?`: `boolean`; \} |
| `options.effortDownmapped?` | `boolean` |

## Returns

`Promise`\&lt;`void`\&gt;
