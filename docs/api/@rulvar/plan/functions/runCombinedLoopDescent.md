[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runCombinedLoopDescent

# Function: runCombinedLoopDescent()

```ts
function runCombinedLoopDescent(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L156)

combined-loop-descent (DEF-2): a verify-failed gate raises the ladder
rung; the raised rung hits its turn limit at the top (trigger 'limit')
and the node fails; the failure wakes a replan that decomposes the
work into two depth-1 children; one child completes and the other
escalates until its escalationUnits deny; Phi strictly decreases on
every debiting entry and matches the embedded balances.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
