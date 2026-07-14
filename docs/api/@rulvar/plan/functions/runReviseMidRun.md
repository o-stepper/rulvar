[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runReviseMidRun

# Function: runReviseMidRun()

```ts
function runReviseMidRun(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L207)

revise-mid-run: a plan revision arrives while a worker subtree is
mid-flight. The first worker HANGS until the
revision cancels it; the added replacement completes.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
