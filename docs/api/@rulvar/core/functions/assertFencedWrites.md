[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / assertFencedWrites

# Function: assertFencedWrites()

```ts
function assertFencedWrites(stores): void;
```

Defined in: [packages/core/src/stores/fenced.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/fenced.ts#L23)

Deployment-time assertion for queue hosts that require the full
fence: throws a typed ConfigError naming each store that does NOT
declare `fencedWrites`. A host that tolerates advisory meta or
transcript writes simply never calls this.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stores` | \{ `journal`: [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md); `transcripts?`: [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md); \} |
| `stores.journal` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) |
| `stores.transcripts?` | [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md) |

## Returns

`void`
