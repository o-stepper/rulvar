[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalEntry

# Type Alias: JournalEntry

```ts
type JournalEntry = {
  abandon?: AbandonPayload;
  artifacts?: Json;
  checkpointRef?: string;
  costAttribution?: CostAttributionFacts;
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

Defined in: [packages/core/src/l0/entries.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L168)

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L227)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L217)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L211)

***

### costAttribution?

```ts
optional costAttribution?: CostAttributionFacts;
```

Defined in: [packages/core/src/l0/entries.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L209)

Terminal usage-bearing entries: the attribution facts behind the
CostReport breakdowns, so a pure journal fold reproduces the live
report byte for byte on replay. Policy, never identity, exactly
like usageByModel.

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L236)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L239)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L185)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L223)

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (DEF-1).

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: [packages/core/src/l0/entries.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L170)

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L180)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L182)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L234)

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L181)

***

### ref?

```ts
optional ref?: number;
```

Defined in: [packages/core/src/l0/entries.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L178)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L225)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L179)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L172)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L190)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L237)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L238)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L183)

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L210)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L186)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L188)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### usageByModel?

```ts
optional usageByModel?: UsageSlice[];
```

Defined in: [packages/core/src/l0/entries.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L202)

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

Defined in: [packages/core/src/l0/entries.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L184)
