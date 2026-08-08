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

Defined in: [packages/core/src/l0/events.ts:693](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L693)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:698](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L698) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:699](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L699) |
| `runId` | `string` | [packages/core/src/l0/events.ts:694](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L694) |
| `seq` | `number` | [packages/core/src/l0/events.ts:695](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L695) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:697](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L697) |
| `ts` | `string` | [packages/core/src/l0/events.ts:696](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L696) |
