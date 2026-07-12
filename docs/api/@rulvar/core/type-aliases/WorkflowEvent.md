[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WorkflowEvent

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

Defined in: [packages/core/src/l0/events.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L193)

The envelope (docs/09 section 1.1): seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events
(docs/09 section 1.5); stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L198) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L199) |
| `runId` | `string` | [packages/core/src/l0/events.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L194) |
| `seq` | `number` | [packages/core/src/l0/events.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L195) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L197) |
| `ts` | `string` | [packages/core/src/l0/events.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L196) |
