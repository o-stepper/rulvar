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

Defined in: [packages/core/src/l0/events.ts:677](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L677)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:682](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L682) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:683](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L683) |
| `runId` | `string` | [packages/core/src/l0/events.ts:678](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L678) |
| `seq` | `number` | [packages/core/src/l0/events.ts:679](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L679) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:681](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L681) |
| `ts` | `string` | [packages/core/src/l0/events.ts:680](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L680) |
