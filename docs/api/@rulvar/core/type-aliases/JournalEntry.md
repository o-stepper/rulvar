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
  usageSemantics?: string;
  value?: Json;
};
```

Defined in: [packages/core/src/l0/entries.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L181)

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L255)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L245)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L239)

***

### costAttribution?

```ts
optional costAttribution?: CostAttributionFacts;
```

Defined in: [packages/core/src/l0/entries.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L222)

Terminal usage-bearing entries: the attribution facts behind the
CostReport breakdowns, so a pure journal fold reproduces the live
report byte for byte on replay. Policy, never identity, exactly
like usageByModel.

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L264)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L267)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L198)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L251)

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (DEF-1).

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: [packages/core/src/l0/entries.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L183)

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L193)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L195)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L262)

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L194)

***

### ref?

```ts
optional ref?: number;
```

Defined in: [packages/core/src/l0/entries.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L191)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L253)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L192)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L185)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L203)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L265)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L266)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L196)

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L238)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L199)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L201)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### usageByModel?

```ts
optional usageByModel?: UsageSlice[];
```

Defined in: [packages/core/src/l0/entries.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L215)

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

### usageSemantics?

```ts
optional usageSemantics?: string;
```

Defined in: [packages/core/src/l0/entries.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L237)

The serving adapters' declared usage-telemetry semantics at write
time (ProviderAdapter.usageSemantics), stamped so cost numbers stay
auditable across normalization corrections: an UNSTAMPED OpenAI
entry with cacheWriteTokens > 0 may have been written by rulvar
v1.19.0, whose adapter double-counted cache writes into inputTokens
(v1.20.0 review P1/P2-2). The stamp unions every adapter that
served a slice of the entry, distinct declarations joined with '+'
in first-appearance order, so a mixed-adapter call whose primary
declares nothing is still dated by its declaring slices. Absent
only when NO serving adapter declares semantics, and on all entries
written before this shipped. Policy, never identity, exactly like
usageByModel.

***

### value?

```ts
optional value?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L197)
