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

Defined in: [packages/core/src/l0/events.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L223)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L228) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L229) |
| `runId` | `string` | [packages/core/src/l0/events.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L224) |
| `seq` | `number` | [packages/core/src/l0/events.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L225) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L227) |
| `ts` | `string` | [packages/core/src/l0/events.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L226) |
