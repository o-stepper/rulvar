[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / accountSpendFromJournal

# Function: accountSpendFromJournal()

```ts
function accountSpendFromJournal(entries, priceUsd): Record<string, number>;
```

Defined in: [packages/core/src/engine/cost-report.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/cost-report.ts#L308)

The per-account settled fold (RV1505, closing the DEF-7 remainder):
each budget account's INCLUSIVE spend from the same entries, skips,
and per-request pricing the net CostReport folds, with the account
tree read from the journaled spawn-admission decisions
(childScope -> parentAccountScope). A scope with no journaled edge
folds under the root, which is where its spend already lands. Two
consumers: hosts and audits hold any account's accumulated spend
against its cap after the fact, and the engine seeds these rows
into every re-opened account on resume (RunBudget seed.accounts),
so a resumed segment admits against the same history a continuous
run would have accumulated; the seed is safe for continuations
because reruns of journaled invocations re-admit as recovered
rather than re-clearing projected admission. Unpriced slices
contribute zero, exactly like the net total, and an admission-edge
cycle (a corrupt journal) terminates the walk instead of spinning.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |

## Returns

`Record`\&lt;`string`, `number`\&gt;
