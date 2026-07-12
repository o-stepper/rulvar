[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / wrapJournalStore

# Function: wrapJournalStore()

```ts
function wrapJournalStore(inner, hook): JournalStore;
```

Defined in: [packages/core/src/l0/serialization.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L77)

Wraps a journal store with the hook; lease capability is preserved.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inner` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) |
| `hook` | [`JournalSerializationHook`](/api/@rulvar/core/interfaces/JournalSerializationHook.md) |

## Returns

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md)
