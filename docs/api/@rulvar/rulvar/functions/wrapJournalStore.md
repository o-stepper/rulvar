[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / wrapJournalStore

# Function: wrapJournalStore()

```ts
function wrapJournalStore(inner, hook): JournalStore;
```

Defined in: `packages/core/dist/index.d.ts`

Wraps a journal store with the hook; the lease and meta lookup
capabilities are preserved (meta is never hooked, exactly like
putMeta/listRuns pass through).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inner` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) |
| `hook` | [`JournalSerializationHook`](/api/@rulvar/rulvar/interfaces/JournalSerializationHook.md) |

## Returns

[`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md)
