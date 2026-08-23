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

Defined in: [packages/core/src/l0/events.ts:761](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L761)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:766](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L766) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:767](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L767) |
| `runId` | `string` | [packages/core/src/l0/events.ts:762](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L762) |
| `seq` | `number` | [packages/core/src/l0/events.ts:763](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L763) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:765](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L765) |
| `ts` | `string` | [packages/core/src/l0/events.ts:764](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L764) |
