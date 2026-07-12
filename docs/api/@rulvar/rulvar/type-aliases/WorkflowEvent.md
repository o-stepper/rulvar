[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WorkflowEvent

# Type Alias: WorkflowEvent

```ts
type WorkflowEvent = {
  parentSpanId?: string;
  replayed?: boolean;
  runId: string;
  seq: number;
  spanId: string;
  ts: string;
} & WorkflowEventBody;
```

Defined in: `packages/core/dist/index.d.ts`

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | `packages/core/dist/index.d.ts` |
| `replayed?` | `boolean` | `packages/core/dist/index.d.ts` |
| `runId` | `string` | `packages/core/dist/index.d.ts` |
| `seq` | `number` | `packages/core/dist/index.d.ts` |
| `spanId` | `string` | `packages/core/dist/index.d.ts` |
| `ts` | `string` | `packages/core/dist/index.d.ts` |
