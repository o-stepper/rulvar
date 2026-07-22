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

Defined in: [packages/core/src/l0/events.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L239)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L244) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L245) |
| `runId` | `string` | [packages/core/src/l0/events.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L240) |
| `seq` | `number` | [packages/core/src/l0/events.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L241) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L243) |
| `ts` | `string` | [packages/core/src/l0/events.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L242) |
