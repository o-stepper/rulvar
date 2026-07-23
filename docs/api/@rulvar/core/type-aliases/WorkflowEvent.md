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

Defined in: [packages/core/src/l0/events.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L298)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L303) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L304) |
| `runId` | `string` | [packages/core/src/l0/events.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L299) |
| `seq` | `number` | [packages/core/src/l0/events.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L300) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L302) |
| `ts` | `string` | [packages/core/src/l0/events.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L301) |
