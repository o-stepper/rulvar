[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / lastRunSettle

# Function: lastRunSettle()

```ts
function lastRunSettle(entries): 
  | {
  runStatus: RunStatus;
  seq: number;
}
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The last journaled run settle of a journal, if any.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

  \| \{
  `runStatus`: [`RunStatus`](/api/@rulvar/rulvar/type-aliases/RunStatus.md);
  `seq`: `number`;
\}
  \| `undefined`
