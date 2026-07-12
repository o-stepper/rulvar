[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runLegacyJournalResume

# Function: runLegacyJournalResume()

```ts
function runLegacyJournalResume(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:1237](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L1237)

legacy-journal-resume (DEF-3): a journal whose spawns carry no lineage
records (the pre-lineage shape) resumes on the current engine; the
legacy spawns canonize onto deterministic 'legacy:' LTIDs, forward
matching pays nothing for them, and the NEW lineage-declaring spawn's
admission entry carries sigVersion 1.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
