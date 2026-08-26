[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WorkflowEvent

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

Defined in: [packages/core/src/l0/events.ts:771](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L771)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:776](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L776) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:777](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L777) |
| `runId` | `string` | [packages/core/src/l0/events.ts:772](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L772) |
| `seq` | `number` | [packages/core/src/l0/events.ts:773](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L773) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:775](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L775) |
| `ts` | `string` | [packages/core/src/l0/events.ts:774](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L774) |
