[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runReviseRacingDefaultDecision

# Function: runReviseRacingDefaultDecision()

```ts
function runReviseRacingDefaultDecision(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2042](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2042)

revise-racing-defaultDecision (DEF-8, mandatory): while the
orchestrator sleeps, the upstream Flavor B timeout resolves a node
done, a second node escalates, and a third completes; the wake
submits ONE stale-based revision {waive_dep, park_task, cancel_task}
whose trio drops with the exact reasons and the blockingRef pointing
at the defaultDecision resolution.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
