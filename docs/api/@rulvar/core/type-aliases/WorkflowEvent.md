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

Defined in: [packages/core/src/l0/events.ts:387](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L387)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:392](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L392) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:393](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L393) |
| `runId` | `string` | [packages/core/src/l0/events.ts:388](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L388) |
| `seq` | `number` | [packages/core/src/l0/events.ts:389](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L389) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:391](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L391) |
| `ts` | `string` | [packages/core/src/l0/events.ts:390](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L390) |
