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

Defined in: [packages/core/src/l0/events.ts:452](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L452)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:457](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L457) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:458](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L458) |
| `runId` | `string` | [packages/core/src/l0/events.ts:453](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L453) |
| `seq` | `number` | [packages/core/src/l0/events.ts:454](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L454) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:456](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L456) |
| `ts` | `string` | [packages/core/src/l0/events.ts:455](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L455) |
