[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / foldTermination

# Function: foldTermination()

```ts
function foldTermination(entries): 
  | {
  account: TerminationAccount;
  denials: {
     seq: number;
     value: TerminationDeniedValue;
  }[];
  init: TerminationInitValue;
  initRef: number;
}
  | undefined;
```

Defined in: [packages/core/src/journal/termination.ts:558](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L558)

The replay fold: rebuilds the account from
termination.init and the debiting decision entries, asserting every
embedded balance-after against the recomputation. A divergence raises
the typed journal-integrity error at exactly the diverging entry;
denials are re-issued from termination.denied with zero live calls.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

  \| \{
  `account`: [`TerminationAccount`](/api/@rulvar/core/classes/TerminationAccount.md);
  `denials`: \{
     `seq`: `number`;
     `value`: [`TerminationDeniedValue`](/api/@rulvar/core/interfaces/TerminationDeniedValue.md);
  \}[];
  `init`: [`TerminationInitValue`](/api/@rulvar/core/interfaces/TerminationInitValue.md);
  `initRef`: `number`;
\}
  \| `undefined`
