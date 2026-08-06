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

Defined in: [packages/core/src/l0/events.ts:684](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L684)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:689](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L689) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:690](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L690) |
| `runId` | `string` | [packages/core/src/l0/events.ts:685](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L685) |
| `seq` | `number` | [packages/core/src/l0/events.ts:686](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L686) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:688](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L688) |
| `ts` | `string` | [packages/core/src/l0/events.ts:687](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L687) |
