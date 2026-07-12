[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runAmendVsRunningThenCancelAdd

# Function: runAmendVsRunningThenCancelAdd()

```ts
function runAmendVsRunningThenCancelAdd(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2265](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2265)

amend-vs-running-then-cancel-add (DEF-8): amend_task on a running node
drops node_running; the next revision cancels it and adds the amended
prompt as a NEW node continuing the SAME logical task; the abandon
covers the old branch and replay repays neither (docs/07, 4.7).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
