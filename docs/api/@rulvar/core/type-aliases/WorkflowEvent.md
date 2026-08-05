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

Defined in: [packages/core/src/l0/events.ts:623](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L623)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L628) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:629](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L629) |
| `runId` | `string` | [packages/core/src/l0/events.ts:624](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L624) |
| `seq` | `number` | [packages/core/src/l0/events.ts:625](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L625) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:627](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L627) |
| `ts` | `string` | [packages/core/src/l0/events.ts:626](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L626) |
