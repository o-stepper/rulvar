[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / entryUsageSlices

# Function: entryUsageSlices()

```ts
function entryUsageSlices(entry): UsageSlice[];
```

Defined in: [packages/core/src/l0/entries.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L129)

The per-model slices of a terminal entry: the recorded split when the
call spanned several models, else the whole usage attributed to
`servedBy`. The fallback is what makes every journal written before the
split shipped price exactly as it did before.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

[`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[]
