[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runRungRetryLineage

# Function: runRungRetryLineage()

```ts
function runRungRetryLineage(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:847](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L847)

rung-retry-lineage (DEF-3): the ladder raise continues the SAME
logical task with relation rung-retry; attemptsUsed counts both rungs.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
