[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunMeta

# Type Alias: RunMeta

```ts
type RunMeta = {
  argsHash?: string;
  argsProvided?: boolean;
  budgetUsd?: number;
  genesis?: string;
  hashVersionHigh?: number;
  hashVersionLow?: number;
  name?: string;
  runId: string;
  segments?: number;
  status: string;
  tags?: string[];
  updatedAt: string;
  workflowHash?: string;
  workflowName?: string;
  workflowSourceRef?: string;
};
```

Defined in: [packages/core/src/l0/spi/store.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L25)

Run-level metadata written by the ENGINE via putMeta as a separate
record, so listRuns never parses payloads. The hashVersion range fields
are advisory only; the journal is authoritative.

## Properties

### argsHash?

```ts
optional argsHash?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L85)

sha256 hex over the JCS canonical serialization of the genesis args
(`hashRunArgs`). Absent when the run started without args or when
the args are not JCS-serializable (`argsProvided` still records
presence). The raw args are never journaled, but the digest is
sensitive-derived metadata, not an opaque token: it is deterministic
and unsalted, so it reveals when two runs (in this store or another)
were started with identical args, and low-entropy args (a boolean,
an approval flag, a role, a short id) are recoverable by hashing
candidate values. Protect meta, `inspect` output, and run listings
with the same access control as the journal and transcripts; the
digest confers no confidentiality on the args it binds. Stores must
round-trip the field (the conformance kit checks).

***

### argsProvided?

```ts
optional argsProvided?: boolean;
```

Defined in: [packages/core/src/l0/spi/store.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L70)

Whether the run started with defined args. Engine-recorded at
genesis and preserved verbatim by every later segment (a resume
never rewrites it from its own re-supplied args). Args themselves
are not journaled; the host re-supplies them on resume, and this
marker plus `argsHash` let a host refuse a resume whose args
silently diverge from the original invocation (the v1.23.0 review:
a CLI resume that forgot `--args` silently changed the logical run
and paid again). Absent on runs started before v1.24.0. Stores must
round-trip the field (the conformance kit checks).

***

### budgetUsd?

```ts
optional budgetUsd?: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L46)

The run's immutable USD ceiling (RunOptions.budgetUsd), recorded so
resume restores the original invocation's bound. Absent when the
run started without a ceiling. Stores must round-trip the field
(the conformance kit checks); a store that drops it degrades a
resumed run to uncapped.

***

### genesis?

```ts
optional genesis?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L97)

Unique token minted at the run's fresh start (genesis) and preserved
verbatim by every later segment, so two runs that reuse the same
explicit runId after a `deleteRun` are distinguishable: journal
length and workflow identity can coincide, this token cannot (the
v1.25.0 scale review: the queue worker's skip cache mistook a
recreated run for the old unchanged one and never resumed it).
Absent on runs started before the field shipped; readers treat
absence as "cannot prove same generation" and act accordingly.
Stores must round-trip the field (the conformance kit checks).

***

### hashVersionHigh?

```ts
optional hashVersionHigh?: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L32)

***

### hashVersionLow?

```ts
optional hashVersionLow?: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L31)

***

### name?

```ts
optional name?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L28)

***

### runId

```ts
runId: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L26)

***

### segments?

```ts
optional segments?: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L58)

Count of execution segments this run has STARTED (a fresh start
writes 1; every resume writes prior + 1, durably, BEFORE the
segment emits its first event). The engine derives each segment's
WorkflowEvent seq and span-id base from it, which is what keeps
`seq` strictly increasing and `spanId` unique per run across
suspend/resume and process recreation, even after a crash-killed
segment (v1.22.0 review P1-2). Stores must round-trip the field
(the conformance kit checks); a store that drops it degrades a
resumed run's telemetry counters to per-segment, never the journal.

***

### status

```ts
status: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L27)

***

### tags?

```ts
optional tags?: string[];
```

Defined in: [packages/core/src/l0/spi/store.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L29)

***

### updatedAt

```ts
updatedAt: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L30)

***

### workflowHash?

```ts
optional workflowHash?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L36)

Content hash of the body or of the compiled source.

***

### workflowName?

```ts
optional workflowName?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L34)

Registered workflow name (in-process Workflow).

***

### workflowSourceRef?

```ts
optional workflowSourceRef?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L38)

TranscriptStore ref of the persisted CompiledWorkflow source.
