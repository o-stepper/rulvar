[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateEntryShape

# Function: validateEntryShape()

```ts
function validateEntryShape(entry): Issue[];
```

Defined in: `packages/core/dist/index.d.ts`

Validates the shape the engine is about to append. Returns issues;
empty means valid. Unknown kinds are rejected here (the engine never
writes them); stores still pass them through on read.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

[`Issue`](/api/@rulvar/rulvar/type-aliases/Issue.md)[]
