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

Defined in: [packages/core/src/l0/events.ts:744](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L744)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:749](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L749) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:750](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L750) |
| `runId` | `string` | [packages/core/src/l0/events.ts:745](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L745) |
| `seq` | `number` | [packages/core/src/l0/events.ts:746](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L746) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:748](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L748) |
| `ts` | `string` | [packages/core/src/l0/events.ts:747](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L747) |
