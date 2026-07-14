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

Defined in: [packages/core/src/l0/events.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L216)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L221) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L222) |
| `runId` | `string` | [packages/core/src/l0/events.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L217) |
| `seq` | `number` | [packages/core/src/l0/events.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L218) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L220) |
| `ts` | `string` | [packages/core/src/l0/events.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L219) |
