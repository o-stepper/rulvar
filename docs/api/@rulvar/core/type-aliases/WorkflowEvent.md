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

Defined in: [packages/core/src/l0/events.ts:367](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L367)

The envelope: seq is an independent per-run
telemetry counter, strictly increasing in emission order and DISTINCT
from JournalEntry.seq (never compare or join the two; entryRef fields
carry journal seqs explicitly). ts is wall clock, telemetry only.
replayed is true only on re-emitted journal-backed lifecycle events;
stream deltas are never re-emitted.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `parentSpanId?` | `string` | [packages/core/src/l0/events.ts:372](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L372) |
| `replayed?` | `boolean` | [packages/core/src/l0/events.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L373) |
| `runId` | `string` | [packages/core/src/l0/events.ts:368](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L368) |
| `seq` | `number` | [packages/core/src/l0/events.ts:369](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L369) |
| `spanId` | `string` | [packages/core/src/l0/events.ts:371](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L371) |
| `ts` | `string` | [packages/core/src/l0/events.ts:370](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L370) |
