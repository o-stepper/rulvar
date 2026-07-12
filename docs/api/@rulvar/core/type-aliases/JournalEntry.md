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

Defined in: [packages/core/src/l0/entries.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L97)

Final entry form (hashVersion 2; docs/03, section "JournalEntry form").
All journaled values MUST be JSON-serializable; a violation raises a
typed NonSerializableValueError at the call site. append is serialized
by a per-run queue.

## Properties

### abandon?

```ts
optional abandon?: AbandonPayload;
```

Defined in: [packages/core/src/l0/entries.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L138)

Only when kind === 'abandon'.

***

### artifacts?

```ts
optional artifacts?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L127)

Terminal agent entries: the Artifact list (worktree patch refs and
inline values); rides the terminal payload so replay reconstructs
AgentResult.artifacts without live calls (docs/06, section 2.1).

***

### checkpointRef?

```ts
optional checkpointRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L121)

***

### deadlineAt?

```ts
optional deadlineAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L147)

On suspended entries: the journaled deadline.

***

### endedAt?

```ts
optional endedAt?: string;
```

Defined in: [packages/core/src/l0/entries.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L150)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/l0/entries.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L114)

***

### escalation?

```ts
optional escalation?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L134)

Terminal escalated entries ONLY: the schema-validated
EscalationReport with runtime-filled costToDate and salvage; replay
synthesizes the byte-identical report from here (docs/03, section
5.4; DEF-1).

***

### hashVersion

```ts
hashVersion: HashVersion;
```

Defined in: [packages/core/src/l0/entries.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L99)

Identity-derivation and replay-semantics version of THIS entry.

***

### key

```ts
key: string;
```

Defined in: [packages/core/src/l0/entries.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L109)

***

### kind

```ts
kind: EntryKind;
```

Defined in: [packages/core/src/l0/entries.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L111)

***

### memoizeOutcome?

```ts
optional memoizeOutcome?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L145)

Policy field on agent entries, fixed in the payload at dispatch time
(docs/03, section "Normative payload schemas"): the M2 predicate reads
the flag from the ENTRY, never from current code. Excluded from
identity like every policy field.

***

### ordinal

```ts
ordinal: number;
```

Defined in: [packages/core/src/l0/entries.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L110)

***

### ref?

```ts
optional ref?: number;
```

Defined in: [packages/core/src/l0/entries.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L107)

Backward reference by seq, always ref < seq: on ref-entries
(resolution/abandon) the seq of the target; on terminal phase entries
the seq of the running entry.

***

### resolution?

```ts
optional resolution?: ResolutionPayload;
```

Defined in: [packages/core/src/l0/entries.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L136)

Only when kind === 'resolution'.

***

### scope

```ts
scope: string;
```

Defined in: [packages/core/src/l0/entries.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L108)

***

### seq

```ts
seq: number;
```

Defined in: [packages/core/src/l0/entries.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L101)

Total order per run; canonical EntryRef = seq.

***

### servedBy?

```ts
optional servedBy?: ModelRef;
```

Defined in: [packages/core/src/l0/entries.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L119)

Who actually served (failover changes only this, never the key).

***

### spanId

```ts
spanId: string;
```

Defined in: [packages/core/src/l0/entries.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L148)

***

### startedAt

```ts
startedAt: string;
```

Defined in: [packages/core/src/l0/entries.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L149)

***

### status

```ts
status: EntryStatus;
```

Defined in: [packages/core/src/l0/entries.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L112)

***

### transcriptRef?

```ts
optional transcriptRef?: string;
```

Defined in: [packages/core/src/l0/entries.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L120)

***

### usage?

```ts
optional usage?: Usage;
```

Defined in: [packages/core/src/l0/entries.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L115)

***

### usageApprox?

```ts
optional usageApprox?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L117)

True when the stream was cut at the budget ceiling or by a stream failure.

***

### value?

```ts
optional value?: Json;
```

Defined in: [packages/core/src/l0/entries.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L113)
