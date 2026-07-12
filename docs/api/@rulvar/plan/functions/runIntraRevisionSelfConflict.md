[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runIntraRevisionSelfConflict

# Function: runIntraRevisionSelfConflict()

```ts
function runIntraRevisionSelfConflict(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2356](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2356)

intra-revision-self-conflict (DEF-8): one revision {cancel_task X,
amend_task X, rewire_deps with an edge onto X} resolves strictly in
submission order per the sequential intra-revision application
semantics (docs/07, 4.7 conflict table).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
