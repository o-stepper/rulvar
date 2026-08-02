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

Defined in: [packages/core/src/l0/events.ts:572](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L572)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:577](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L577) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:578](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L578) |
| `runId` | `string` | [packages/core/src/l0/events.ts:573](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L573) |
| `seq` | `number` | [packages/core/src/l0/events.ts:574](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L574) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:576](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L576) |
| `ts` | `string` | [packages/core/src/l0/events.ts:575](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L575) |
