[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / hasFencedWrites

# Function: hasFencedWrites()

```ts
function hasFencedWrites(store): boolean;
```

Defined in: [packages/core/src/stores/fenced.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/fenced.ts#L13)

Capability guard: the store declares the fenced writes promise.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | \| [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) \| [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md) |

## Returns

`boolean`
