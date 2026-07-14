[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalEntry

# Type Alias: JournalEntry

```ts
type JournalEntry = {
  abandon?: AbandonPayload;
  artifacts?: Json;
  checkpointRef?: string;
  deadlineAt?: string;
  endedAt?: string;
  error?: WireError;
  escalation?: Json;
  hashVersion: HashVersion;
  key: string;
  kind: EntryKind;
  memoizeOutcome?: boolean;
  ordinal: number;
  ref?: number;
  resolution?: ResolutionPayload;
  scope: string;
  seq: number;
  servedBy?: ModelRef;
  spanId: string;
  startedAt: string;
  status: EntryStatus;
  transcriptRef?: string;
  usage?: Usage;
  usageApprox?: boolean;
  usageByModel?: UsageSlice[];
  value?: Json;
};
```

Defined in: [packages/core/src/l0/entries.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L150)

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L202)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L192)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L186)

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L211)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L214)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L167)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L198)

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (DEF-1).

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: [packages/core/src/l0/entries.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L152)

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L162)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L164)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L209)

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L163)

***

### ref?

```ts
optional ref?: number;
```

Defined in: [packages/core/src/l0/entries.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L160)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L200)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L161)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L154)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L172)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L212)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L213)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L165)

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L185)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L168)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L170)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### usageByModel?

```ts
optional usageByModel?: UsageSlice[];
```

Defined in: [packages/core/src/l0/entries.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L184)

Terminal agent entries whose phases were served by MORE THAN ONE
model: usage split by the model that actually served each slice. The
loop, extract, finalize, and summarize roles resolve independently,
so a single agent call routinely spans models at different prices;
pricing the whole call at `servedBy` bills the cheap extract at the
loop model's rate. Absent when one model served the whole call, and
on entries written before the split shipped: readers fall back to
pricing `usage` at `servedBy`, which is exactly correct for those.
Policy, never identity: it does not enter the content key.

***

### value?

```ts
optional value?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L166)
