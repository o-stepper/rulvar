[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runOscillationBounded

# Function: runOscillationBounded()

```ts
function runOscillationBounded(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:898](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L898)

oscillation-bounded (DEF-2): an escalated branch is cancelled and
re-added byte-identically twice; every plan_revise call debits one
revisionUnit (including the drop on the linked done node), each link
debits one spawnUnit, the worker is paid exactly once, and the
lineage counters never reset.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
