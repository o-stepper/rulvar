[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalEntry

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
  evidence?: {
     met: boolean;
     minEntries: number;
     recordedEntries: number;
  };
  evidenceEntries?: {
     citation?: string;
     claim: string;
  }[];
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
  toolBudget?: {
     cap?: number;
     used: number;
  };
  transcriptRef?: string;
  usage?: Usage;
  usageApprox?: boolean;
  usageByModel?: UsageSlice[];
  usageSemantics?: string;
  value?: Json;
};
```

Defined in: `packages/core/dist/index.d.ts`

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: `packages/core/dist/index.d.ts`

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: `packages/core/dist/index.d.ts`

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### costAttribution?

```ts
optional costAttribution?: CostAttributionFacts;
```

Defined in: `packages/core/dist/index.d.ts`

Terminal usage-bearing entries: the attribution facts behind the
CostReport breakdowns, so a pure journal fold reproduces the live
report byte for byte on replay. Policy, never identity, exactly
like usageByModel.

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### error?

```ts
optional error?: WireError;
```

Defined in: `packages/core/dist/index.d.ts`

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: `packages/core/dist/index.d.ts`

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (DEF-1).

***

### evidence?

```ts
optional evidence?: {
  met: boolean;
  minEntries: number;
  recordedEntries: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

Terminal agent entries: the evidence verdict under a declared
contract (RV806), journaled so replay restores
AgentResult.evidence without re-deriving a window it no longer
holds (the RV1501 entries plumbing). Policy, never identity,
exactly like usageByModel.

#### met

```ts
met: boolean;
```

#### minEntries

```ts
minEntries: number;
```

#### recordedEntries

```ts
recordedEntries: number;
```

***

### evidenceEntries?

```ts
optional evidenceEntries?: {
  citation?: string;
  claim: string;
}[];
```

Defined in: `packages/core/dist/index.d.ts`

Terminal agent entries: the recorded evidence entry CONTENT (the
RV1501 entries plumbing): each successful record_evidence
execution's claim plus its file or file:lines citation, in record
order, bounded at collection time (40 entries, 400 chars per
claim). Rides the terminal payload so replay reconstructs
AgentResult.evidenceEntries without live calls and a resumed
orchestrator pairs its claim pools against what the child
actually recorded, exactly like a live run. Policy, never
identity.

#### citation?

```ts
optional citation?: string;
```

#### claim

```ts
claim: string;
```

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: `packages/core/dist/index.d.ts`

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### kind

```ts
kind: EntryKind;
```

Defined in: `packages/core/dist/index.d.ts`

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### providerCalls?

```ts
optional providerCalls?: ProviderCallRecord[];
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: `packages/core/dist/index.d.ts`

***

### scope

```ts
scope: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### seq

```ts
seq: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: `packages/core/dist/index.d.ts`

***

### spanId

```ts
spanId: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### startedAt

```ts
startedAt: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### status

```ts
status: EntryStatus;
```

Defined in: `packages/core/dist/index.d.ts`

***

### toolBudget?

```ts
optional toolBudget?: {
  cap?: number;
  used: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

Terminal agent entries: the durable subset of the tool-budget
summary (RV3002): the loop's executed-call counter and the
effective cap at the end, journaled at settle whenever the live
result carried a summary. The counter has always been durable in
the terminal checkpoint, but checkpoints are blobs and journal
folds read entries only, so without this field observed
calls-per-evidence-entry calibration cannot be a pure fold. Replay
restores AgentResult.toolBudget from here unconditionally; entries
without the field (every pre-existing journal) keep the RV509
decision-conditional path byte for byte. Live-only summary fields
(unitsUsed, noticesFired, limiter, and the rest) never journal.
Policy, never identity, exactly like evidence.

#### cap?

```ts
optional cap?: number;
```

#### used

```ts
used: number;
```

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: `packages/core/dist/index.d.ts`

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

***

### usageByModel?

```ts
optional usageByModel?: UsageSlice[];
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`
