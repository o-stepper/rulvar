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
  hostRejected?: boolean;
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

Defined in: [packages/core/src/l0/entries.ts:517](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L517)

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:648](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L648)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:593](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L593)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:587](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L587)

***

### costAttribution?

```ts
optional costAttribution?: CostAttributionFacts;
```

Defined in: [packages/core/src/l0/entries.ts:558](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L558)

Terminal usage-bearing entries: the attribution facts behind the
CostReport breakdowns, so a pure journal fold reproduces the live
report byte for byte on replay. Policy, never identity, exactly
like usageByModel.

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:657](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L657)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:660](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L660)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:534](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L534)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:644](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L644)

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

Defined in: [packages/core/src/l0/entries.ts:601](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L601)

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

Defined in: [packages/core/src/l0/entries.ts:613](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L613)

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

Defined in: [packages/core/src/l0/entries.ts:519](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L519)

Identity-derivation and replay-semantics version of THIS entry.

***

### hostRejected?

```ts
optional hostRejected?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:638](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L638)

Terminal agent entries whose invocation was aborted by the host's
finish rejection (RV3702): the declared finish contract rejected
the candidate past its repair bound, so the span died by host
hand with its wires fine. Stamped at settle from the typed abort
reason; never on a defective (throwing) validator, whose abort
carries its own reason, because a host defect is not a verdict on
the candidate. Policy, never identity, exactly like usageByModel.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:529](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L529)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L531)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:655](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L655)

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:530](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L530)

***

### providerCalls?

```ts
optional providerCalls?: ProviderCallRecord[];
```

Defined in: [packages/core/src/l0/entries.ts:570](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L570)

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

Defined in: [packages/core/src/l0/entries.ts:527](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L527)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:646](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L646)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:528](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L528)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:521](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L521)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:539](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L539)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:658](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L658)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:659](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L659)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:532](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L532)

***

### toolBudget?

```ts
optional toolBudget?: {
  cap?: number;
  used: number;
};
```

Defined in: [packages/core/src/l0/entries.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L628)

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

Defined in: [packages/core/src/l0/entries.ts:586](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L586)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:535](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L535)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:537](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L537)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### usageByModel?

```ts
optional usageByModel?: UsageSlice[];
```

Defined in: [packages/core/src/l0/entries.ts:551](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L551)

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

Defined in: [packages/core/src/l0/entries.ts:585](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L585)

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

Defined in: [packages/core/src/l0/entries.ts:533](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L533)
