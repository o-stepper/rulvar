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

Defined in: [packages/core/src/l0/events.ts:539](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L539)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:544](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L544) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:545](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L545) |
| `runId` | `string` | [packages/core/src/l0/events.ts:540](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L540) |
| `seq` | `number` | [packages/core/src/l0/events.ts:541](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L541) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:543](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L543) |
| `ts` | `string` | [packages/core/src/l0/events.ts:542](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L542) |
