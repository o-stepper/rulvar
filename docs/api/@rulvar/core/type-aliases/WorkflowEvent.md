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

Defined in: [packages/core/src/l0/events.ts:491](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L491)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:496](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L496) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:497](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L497) |
| `runId` | `string` | [packages/core/src/l0/events.ts:492](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L492) |
| `seq` | `number` | [packages/core/src/l0/events.ts:493](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L493) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:495](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L495) |
| `ts` | `string` | [packages/core/src/l0/events.ts:494](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L494) |
