[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runBadBaseStreakTerminates

# Function: runBadBaseStreakTerminates()

```ts
function runBadBaseStreakTerminates(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2449](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2449)

bad-base-streak-terminates (DEF-8): three consecutive revisions with a
fabricated base.planHash land as all-dropped bad-base entries; the
dropped streak reaches its limit and the non-HITL RevisionGuards
fallback (finish-with-partial) closes the run.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
