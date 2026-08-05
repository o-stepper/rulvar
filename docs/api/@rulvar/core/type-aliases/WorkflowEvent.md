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

Defined in: [packages/core/src/l0/events.ts:601](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L601)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:606](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L606) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:607](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L607) |
| `runId` | `string` | [packages/core/src/l0/events.ts:602](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L602) |
| `seq` | `number` | [packages/core/src/l0/events.ts:603](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L603) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:605](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L605) |
| `ts` | `string` | [packages/core/src/l0/events.ts:604](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L604) |
