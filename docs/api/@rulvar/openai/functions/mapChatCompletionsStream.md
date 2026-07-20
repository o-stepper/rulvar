[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / mapChatCompletionsStream

# Function: mapChatCompletionsStream()

```ts
function mapChatCompletionsStream(
   stream, 
   ids, 
options?): AsyncGenerator<ChatEvent, void>;
```

Defined in: [packages/openai/src/wire.ts:704](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L704)

Delta-patched chunk assembly for the degraded path; yields each
canonical event as its chunk is consumed (same live-streaming contract
as mapResponsesStream).

The chat dialect has no explicit terminal frame at this layer: the
only completion signal is a `finish_reason` on the last choice chunk.
A stream that drains without one is a truncated wire read, so the
mapper fails closed with one retryable transport error (after
forwarding any usage the provider did report, which was still paid
for) instead of synthesizing a `stop` finish, unless `options.signal`
shows the caller requested the abort.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | `AsyncIterable`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt; |
| `ids` | [`OpenAiIdMap`](/api/@rulvar/openai/classes/OpenAiIdMap.md) |
| `options?` | \{ `signal?`: `AbortSignal`; \} |
| `options.signal?` | `AbortSignal` |

## Returns

`AsyncGenerator`\&lt;[`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md), `void`\&gt;
