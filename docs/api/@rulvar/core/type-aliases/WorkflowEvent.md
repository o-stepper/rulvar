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

Defined in: [packages/core/src/l0/events.ts:588](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L588)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:593](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L593) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:594](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L594) |
| `runId` | `string` | [packages/core/src/l0/events.ts:589](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L589) |
| `seq` | `number` | [packages/core/src/l0/events.ts:590](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L590) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:592](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L592) |
| `ts` | `string` | [packages/core/src/l0/events.ts:591](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L591) |
