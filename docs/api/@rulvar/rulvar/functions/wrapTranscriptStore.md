[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / wrapTranscriptStore

# Function: wrapTranscriptStore()

```ts
function wrapTranscriptStore(inner, hook): TranscriptStore;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Wraps a transcript store with the hook.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inner` | [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md) |
| `hook` | [`TranscriptSerializationHook`](/api/@rulvar/rulvar/interfaces/TranscriptSerializationHook.md) |

## Returns

[`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md)
