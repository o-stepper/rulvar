[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runStallStreakClassesAndPinning

# Function: runStallStreakClassesAndPinning()

```ts
function runStallStreakClassesAndPinning(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:1035](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L1035)

stall-streak-classes-and-pinning (DEF-3): four attempts of one LTID
land transient-error, task-error, no-progress, and ok; the pinned
admission snapshots show stallStreak 0, 1, 2 and the post-ok pinned
view shows 0; a wake turn re-executed after a crash reads the SAME
LineageStats from its snapshot, not a fresh fold.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
