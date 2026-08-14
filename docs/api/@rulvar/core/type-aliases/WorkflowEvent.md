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

Defined in: [packages/core/src/l0/events.ts:753](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L753)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:758](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L758) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:759](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L759) |
| `runId` | `string` | [packages/core/src/l0/events.ts:754](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L754) |
| `seq` | `number` | [packages/core/src/l0/events.ts:755](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L755) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:757](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L757) |
| `ts` | `string` | [packages/core/src/l0/events.ts:756](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L756) |
