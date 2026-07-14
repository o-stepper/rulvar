[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / entryUsageSlices

# Function: entryUsageSlices()

```ts
function entryUsageSlices(entry): UsageSlice[];
```

Defined in: `packages/core/dist/index.d.ts`

The per-model slices of a terminal entry: the recorded split when the
call spanned several models, else the whole usage attributed to
`servedBy`. The fallback is what makes every journal written before the
split shipped price exactly as it did before.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

[`UsageSlice`](/api/@rulvar/rulvar/interfaces/UsageSlice.md)[]
