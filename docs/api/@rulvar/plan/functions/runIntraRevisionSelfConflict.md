[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runIntraRevisionSelfConflict

# Function: runIntraRevisionSelfConflict()

```ts
function runIntraRevisionSelfConflict(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2355](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2355)

intra-revision-self-conflict (DEF-8): one revision {cancel_task X,
amend_task X, rewire_deps with an edge onto X} resolves strictly in
submission order per the sequential intra-revision application
semantics.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
