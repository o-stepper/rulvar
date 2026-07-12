[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runConfigDriftResume

# Function: runConfigDriftResume()

```ts
function runConfigDriftResume(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L339)

config-drift-resume (DEF-2): life 1 runs under maxRevisionsPerRun 2
and crashes at the pre-append kill point of its second revision; life
2 resumes with the knob DOUBLED. Balances continue from the journaled
termination.init (the live config is ignored), a
termination:config-drift event fires, and nothing is repaid.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
