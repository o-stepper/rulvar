[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / wrapTranscriptStore

# Function: wrapTranscriptStore()

```ts
function wrapTranscriptStore(inner, hook): TranscriptStore;
```

Defined in: [packages/core/src/l0/serialization.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L120)

Wraps a transcript store with the hook.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inner` | [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md) |
| `hook` | [`TranscriptSerializationHook`](/api/@rulvar/core/interfaces/TranscriptSerializationHook.md) |

## Returns

[`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md)
