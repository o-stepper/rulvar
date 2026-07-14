[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runAmendVsRunningThenCancelAdd

# Function: runAmendVsRunningThenCancelAdd()

```ts
function runAmendVsRunningThenCancelAdd(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2264](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2264)

amend-vs-running-then-cancel-add (DEF-8): amend_task on a running node
drops node_running; the next revision cancels it and adds the amended
prompt as a NEW node continuing the SAME logical task; the abandon
covers the old branch and replay repays neither.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
