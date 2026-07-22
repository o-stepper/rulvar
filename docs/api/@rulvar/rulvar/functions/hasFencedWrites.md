[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / hasFencedWrites

# Function: hasFencedWrites()

```ts
function hasFencedWrites(store): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Capability guard: the store declares the fenced writes promise.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | \| [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) \| [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md) |

## Returns

`boolean`
