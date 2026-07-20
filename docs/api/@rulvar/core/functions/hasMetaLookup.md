[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / hasMetaLookup

# Function: hasMetaLookup()

```ts
function hasMetaLookup(store): store is MetaLookupStore;
```

Defined in: [packages/core/src/stores/meta-lookup.ts:10](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/meta-lookup.ts#L10)

Capability guard, same shape as the lease capability detection.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) |

## Returns

`store is MetaLookupStore`
