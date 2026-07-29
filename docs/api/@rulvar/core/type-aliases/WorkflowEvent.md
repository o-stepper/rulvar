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

Defined in: [packages/core/src/l0/events.ts:460](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L460)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:465](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L465) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:466](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L466) |
| `runId` | `string` | [packages/core/src/l0/events.ts:461](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L461) |
| `seq` | `number` | [packages/core/src/l0/events.ts:462](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L462) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L464) |
| `ts` | `string` | [packages/core/src/l0/events.ts:463](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L463) |
