[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / applyPlanEntry

# Function: applyPlanEntry()

```ts
function applyPlanEntry(
   state, 
   entry, 
   options?): PlanFoldState;
```

Defined in: [packages/plan/src/plan-entries.ts:465](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L465)

THE single applier: folds one plan-scope entry into the
state. Replay consumes recorded outcomes (the APPLIED diff), never
re-runs rebase, and timers do not run; hash verification runs under
the entry's own hashVersion profile.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`PlanFoldState`](/api/@rulvar/plan/interfaces/PlanFoldState.md) |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |
| `options?` | \{ `deriverFor?`: (`hashVersion`) => \| [`KeyDeriver`](/api/@rulvar/rulvar/interfaces/KeyDeriver.md) \| `undefined`; \} |
| `options.deriverFor?` | (`hashVersion`) => \| [`KeyDeriver`](/api/@rulvar/rulvar/interfaces/KeyDeriver.md) \| `undefined` |

## Returns

[`PlanFoldState`](/api/@rulvar/plan/interfaces/PlanFoldState.md)
