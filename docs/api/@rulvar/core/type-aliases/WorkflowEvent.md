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

Defined in: [packages/core/src/l0/events.ts:403](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L403)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:408](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L408) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:409](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L409) |
| `runId` | `string` | [packages/core/src/l0/events.ts:404](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L404) |
| `seq` | `number` | [packages/core/src/l0/events.ts:405](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L405) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:407](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L407) |
| `ts` | `string` | [packages/core/src/l0/events.ts:406](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L406) |
