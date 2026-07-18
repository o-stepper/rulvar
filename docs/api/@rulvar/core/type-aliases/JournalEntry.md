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

Defined in: [packages/core/src/l0/entries.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L178)

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L237)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L227)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L221)

***

### costAttribution?

```ts
optional costAttribution?: CostAttributionFacts;
```

Defined in: [packages/core/src/l0/entries.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L219)

Terminal usage-bearing entries: the attribution facts behind the
CostReport breakdowns, so a pure journal fold reproduces the live
report byte for byte on replay. Policy, never identity, exactly
like usageByModel.

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L246)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L249)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L195)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L233)

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (DEF-1).

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: [packages/core/src/l0/entries.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L180)

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L190)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L192)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L244)

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L191)

***

### ref?

```ts
optional ref?: number;
```

Defined in: [packages/core/src/l0/entries.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L188)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L235)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L189)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L182)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L200)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L247)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L248)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L193)

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L220)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L196)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L198)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### usageByModel?

```ts
optional usageByModel?: UsageSlice[];
```

Defined in: [packages/core/src/l0/entries.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L212)

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

Defined in: [packages/core/src/l0/entries.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L194)
