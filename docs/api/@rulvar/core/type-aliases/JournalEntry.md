[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalEntry

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
  value?: Json;
};
```

Defined in: [packages/core/src/l0/entries.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L95)

Final entry form (hashVersion 2).
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L135)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L125)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls.

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L119)

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L144)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L147)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L112)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L131)

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (DEF-1).

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: [packages/core/src/l0/entries.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L97)

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L107)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L109)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L142)

Policy field on agent entries, fixed in the payload at dispatch
time: the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L108)

***

### ref?

```ts
optional ref?: number;
```

Defined in: [packages/core/src/l0/entries.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L105)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L133)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L106)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L99)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L117)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L145)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L146)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L110)

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L118)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L113)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L115)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### value?

```ts
optional value?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L111)
