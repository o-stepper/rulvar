[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateEntryShape

# Function: validateEntryShape()

```ts
function validateEntryShape(entry): Issue[];
```

Defined in: [packages/core/src/journal/kinds.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/kinds.ts#L63)

Validates the shape the engine is about to append. Returns issues;
empty means valid. Unknown kinds are rejected here (the engine never
writes them); stores still pass them through on read.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

[`Issue`](/api/@rulvar/core/type-aliases/Issue.md)[]
