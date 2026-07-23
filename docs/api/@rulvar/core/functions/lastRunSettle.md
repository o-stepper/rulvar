[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / lastRunSettle

# Function: lastRunSettle()

```ts
function lastRunSettle(entries): 
  | {
  runStatus: RunStatus;
  seq: number;
}
  | undefined;
```

Defined in: [packages/core/src/stores/reconcile.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L44)

The last journaled run settle of a journal, if any.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

  \| \{
  `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md);
  `seq`: `number`;
\}
  \| `undefined`
