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

Defined in: [packages/core/src/l0/events.ts:725](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L725)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:730](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L730) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:731](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L731) |
| `runId` | `string` | [packages/core/src/l0/events.ts:726](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L726) |
| `seq` | `number` | [packages/core/src/l0/events.ts:727](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L727) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:729](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L729) |
| `ts` | `string` | [packages/core/src/l0/events.ts:728](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L728) |
