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
  providerCalls?: ProviderCallRecord[];
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

Defined in: [packages/core/src/l0/entries.ts:429](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L429)

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:515](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L515)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:505](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L505)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:499](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L499)

***

### costAttribution?

```ts
optional costAttribution?: CostAttributionFacts;
```

Defined in: [packages/core/src/l0/entries.ts:470](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L470)

Terminal usage-bearing entries: the attribution facts behind the
CostReport breakdowns, so a pure journal fold reproduces the live
report byte for byte on replay. Policy, never identity, exactly
like usageByModel.

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:524](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L524)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:527](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L527)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:446](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L446)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:511](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L511)

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (DEF-1).

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: [packages/core/src/l0/entries.ts:431](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L431)

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:441](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L441)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:443](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L443)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:522](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L522)

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:442](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L442)

***

### providerCalls?

```ts
optional providerCalls?: ProviderCallRecord[];
```

Defined in: [packages/core/src/l0/entries.ts:482](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L482)

Terminal agent entries: the per-dispatch reconciliation ledger
(P1.3), one record per live provider call the invocation made,
failed and retried attempts included, so every billable wire call
maps to a journal entry and the invoice export can name the
provider response ids behind the usage total. Absent on entries
written before this shipped and on fully replayed invocations
(which made no calls); the invoice fold surfaces such entries as
unattributed rows instead of losing their spend. Policy, never
identity, exactly like usageByModel.

***

### ref?

```ts
optional ref?: number;
```

Defined in: [packages/core/src/l0/entries.ts:439](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L439)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:513](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L513)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:440](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L440)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:433](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L433)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:451](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L451)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:525](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L525)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:526](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L526)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:444](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L444)

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:498](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L498)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:447](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L447)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:449](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L449)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### usageByModel?

```ts
optional usageByModel?: UsageSlice[];
```

Defined in: [packages/core/src/l0/entries.ts:463](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L463)

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

Defined in: [packages/core/src/l0/entries.ts:497](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L497)

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

Defined in: [packages/core/src/l0/entries.ts:445](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L445)
