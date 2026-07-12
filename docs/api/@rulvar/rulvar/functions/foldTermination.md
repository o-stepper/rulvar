[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / foldTermination

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The replay fold (docs/07, 11.6): rebuilds the account from
termination.init and the debiting decision entries, asserting every
embedded balance-after against the recomputation. A divergence raises
the typed journal-integrity error at exactly the diverging entry;
denials are re-issued from termination.denied with zero live calls.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

  \| \{
  `account`: [`TerminationAccount`](/api/@rulvar/rulvar/classes/TerminationAccount.md);
  `denials`: \{
     `seq`: `number`;
     `value`: [`TerminationDeniedValue`](/api/@rulvar/rulvar/interfaces/TerminationDeniedValue.md);
  \}[];
  `init`: [`TerminationInitValue`](/api/@rulvar/rulvar/interfaces/TerminationInitValue.md);
  `initRef`: `number`;
\}
  \| `undefined`
