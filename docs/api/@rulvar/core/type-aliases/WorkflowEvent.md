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

Defined in: [packages/core/src/l0/events.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L331)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L336) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L337) |
| `runId` | `string` | [packages/core/src/l0/events.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L332) |
| `seq` | `number` | [packages/core/src/l0/events.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L333) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L335) |
| `ts` | `string` | [packages/core/src/l0/events.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L334) |
