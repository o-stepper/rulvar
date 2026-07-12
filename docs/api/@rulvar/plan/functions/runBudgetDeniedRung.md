[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runBudgetDeniedRung

# Function: runBudgetDeniedRung()

```ts
function runBudgetDeniedRung(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:605](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L605)

budget-denied-rung: the budget guard denies the rung respawn; the
denial journals as termination.denied strictly before the verdict and
the ladder takes its declared fallback path.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
