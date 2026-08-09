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

Defined in: [packages/core/src/l0/events.ts:710](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L710)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:715](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L715) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:716](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L716) |
| `runId` | `string` | [packages/core/src/l0/events.ts:711](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L711) |
| `seq` | `number` | [packages/core/src/l0/events.ts:712](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L712) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:714](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L714) |
| `ts` | `string` | [packages/core/src/l0/events.ts:713](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L713) |
