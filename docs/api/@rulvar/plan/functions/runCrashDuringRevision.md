[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runCrashDuringRevision

# Function: runCrashDuringRevision()

```ts
function runCrashDuringRevision(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L288)

crash-during-revision: process death INSIDE the revision window, at
the pre-append kill point: life 1 is truncated
strictly BEFORE the second plan.revision entry; life 2 re-issues the
revision live and rolls its effects forward.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
