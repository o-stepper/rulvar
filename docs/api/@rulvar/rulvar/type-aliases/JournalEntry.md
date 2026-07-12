[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalEntry

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

### value?

```ts
optional value?: Json;
```

Defined in: `packages/core/dist/index.d.ts`
