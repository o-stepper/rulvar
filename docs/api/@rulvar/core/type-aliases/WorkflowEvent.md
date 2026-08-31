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

Defined in: [packages/core/src/l0/events.ts:802](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L802)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:807](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L807) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:808](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L808) |
| `runId` | `string` | [packages/core/src/l0/events.ts:803](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L803) |
| `seq` | `number` | [packages/core/src/l0/events.ts:804](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L804) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:806](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L806) |
| `ts` | `string` | [packages/core/src/l0/events.ts:805](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L805) |
