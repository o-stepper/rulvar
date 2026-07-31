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

Defined in: [packages/core/src/l0/events.ts:552](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L552)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:557](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L557) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:558](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L558) |
| `runId` | `string` | [packages/core/src/l0/events.ts:553](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L553) |
| `seq` | `number` | [packages/core/src/l0/events.ts:554](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L554) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:556](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L556) |
| `ts` | `string` | [packages/core/src/l0/events.ts:555](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L555) |
