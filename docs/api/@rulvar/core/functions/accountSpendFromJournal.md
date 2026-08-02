[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / accountSpendFromJournal

# Function: accountSpendFromJournal()

```ts
function accountSpendFromJournal(entries, priceUsd): Record<string, number>;
```

Defined in: [packages/core/src/engine/cost-report.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/cost-report.ts#L271)

The per-account settled fold (RV1505, the DEF-7 remainder): each
budget account's INCLUSIVE spend from the same entries, skips, and
per-request pricing the net CostReport folds, with the account tree
read from the journaled spawn-admission decisions
(childScope -> parentAccountScope). A scope with no journaled edge
folds under the root, which is where its spend already lands. This
is the AUDIT half of the DEF-7 remainder: a host can hold any
account's accumulated spend against its cap after the fact. Seeding
it into re-opened accounts on resume is deliberately NOT wired yet:
the orchestrate agent re-admits a rerun with exact-fill arithmetic
(spent + proposed reserve vs the ceiling), so any spend-at-reopen
would refuse the continuation of work the money was already spent
ON; the reopen seeding lands together with a seed-aware rerun
re-admission. Unpriced slices contribute zero, exactly like the net
total, and an admission-edge cycle (a corrupt journal) terminates
the walk instead of spinning.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |

## Returns

`Record`\&lt;`string`, `number`\&gt;
