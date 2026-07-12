[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / recordOrchestratorCrash

# Function: recordOrchestratorCrash()

```ts
function recordOrchestratorCrash(): Promise<{
  checkpoints: Record<string, string>;
  entries: JournalEntry[];
}>;
```

Defined in: [packages/testing/src/cassettes/m6-orchestrator.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/cassettes/m6-orchestrator.ts#L61)

Phase 1: record the pre-crash journal. The transcripts store carries
the boundary checkpoint the resume restores from; the recorder keeps
it in memory because the cassette pins only journal bytes (checkpoint
blobs are engine-internal at-least-once state, docs/03 section 11).

## Returns

`Promise`\<\{
  `checkpoints`: `Record`\&lt;`string`, `string`\&gt;;
  `entries`: [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[];
\}\>
