[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runClassStormSingleTurn

# Function: runClassStormSingleTurn()

```ts
function runClassStormSingleTurn(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:430](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L430)

class-storm-single-turn (DEF-2): five dependency-chained workers each
escalate (Flavor A); the orchestrator resolves all five in ONE
revision; the class-level decision carries five per-lineage debits in
one entry. Store-independence (identical fold on JSONL and SQLite) is
asserted by the replay suite over the frozen bytes.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
