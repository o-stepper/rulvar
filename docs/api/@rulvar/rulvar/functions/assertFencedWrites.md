[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / assertFencedWrites

# Function: assertFencedWrites()

```ts
function assertFencedWrites(stores): void;
```

Defined in: `packages/core/dist/index.d.ts`

Deployment-time assertion for queue hosts that require the full
fence: throws a typed ConfigError naming each store that does NOT
declare `fencedWrites`. A host that tolerates advisory meta or
transcript writes simply never calls this. The shipped pair that
satisfies it with transcripts present is `@rulvar/store-sqlite`:
the store as the journal plus its `transcripts()` twin.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stores` | \{ `journal`: [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md); `transcripts?`: [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md); \} |
| `stores.journal` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) |
| `stores.transcripts?` | [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md) |

## Returns

`void`
