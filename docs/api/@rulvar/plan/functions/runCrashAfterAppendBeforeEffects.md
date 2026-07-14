[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runCrashAfterAppendBeforeEffects

# Function: runCrashAfterAppendBeforeEffects()

```ts
function runCrashAfterAppendBeforeEffects(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2167](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2167)

crash-after-append-before-effects (DEF-8): the kill lands immediately
after the durable plan.revision carrying add_task x2 plus cancel_task
on a running node; the resume re-issues the effects: both children
spawn live exactly once and the cancel lands.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
