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

Defined in: [packages/core/src/l0/events.ts:564](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L564)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:569](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L569) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:570](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L570) |
| `runId` | `string` | [packages/core/src/l0/events.ts:565](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L565) |
| `seq` | `number` | [packages/core/src/l0/events.ts:566](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L566) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:568](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L568) |
| `ts` | `string` | [packages/core/src/l0/events.ts:567](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L567) |
