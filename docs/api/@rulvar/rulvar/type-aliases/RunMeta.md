[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunMeta

# Type Alias: RunMeta

```ts
type RunMeta = {
  argsHash?: string;
  argsProvided?: boolean;
  budgetPolicy?: "immutable-lifetime";
  budgetUsd?: number;
  configFingerprint?: string;
  execKeyDerivation?: number;
  genesis?: string;
  hashVersionHigh?: number;
  hashVersionLow?: number;
  maxInFlightExposureUsd?: number;
  name?: string;
  runId: string;
  segments?: number;
  status: string;
  strictPricing?: {
     allowUnpriced?: string[];
     maxRatesAgeDays?: number;
  };
  tags?: string[];
  updatedAt: string;
  workflowHash?: string;
  workflowName?: string;
  workflowSourceRef?: string;
};
```

Defined in: `packages/core/dist/index.d.ts`

Run-level metadata written by the ENGINE via putMeta as a separate
record, so listRuns never parses payloads. The hashVersion range fields
are advisory only; the journal is authoritative.

## Properties

### argsHash?

```ts
optional argsHash?: string;
```

Defined in: `packages/core/dist/index.d.ts`

sha256 hex over the JCS canonical serialization of the genesis args
(`hashRunArgs`). Absent when the run started without args or when
the args are not JCS-serializable (`argsProvided` still records
presence). The raw args are never journaled, but the digest is
sensitive-derived metadata, not an opaque token: it is deterministic
and unsalted BY DEFAULT, so it reveals when two runs (in this store
or another) were started with identical args, and low-entropy args
(a boolean, an approval flag, a role, a short id) are recoverable by
hashing candidate values. `createEngine security.argsHashSalt`
switches the digest to HMAC-SHA256 under a deployment salt (RV-217),
which removes both leaks at the cost of binding every resuming
engine to the same salt. Protect meta, `inspect` output, and run
listings with the same access control as the journal and
transcripts; the digest confers no confidentiality on the args it
binds. Stores must round-trip the field (the conformance kit
checks).

***

### argsProvided?

```ts
optional argsProvided?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

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

### budgetPolicy?

```ts
optional budgetPolicy?: "immutable-lifetime";
```

Defined in: `packages/core/dist/index.d.ts`

The ceiling-override posture (RunOptions.budgetPolicy, RV3902),
recorded at genesis only when 'immutable-lifetime': under it a
resume carrying any ResumeOptions.run override refuses typed
before ownership. Absent means 'segment', the historical
behavior. Stores must round-trip the field (the conformance kit
checks); a store that drops it degrades the run to the 'segment'
posture (the override door works again), never to an invented
refusal.

***

### budgetUsd?

```ts
optional budgetUsd?: number;
```

Defined in: `packages/core/dist/index.d.ts`

The run's segment-immutable USD ceiling (RunOptions.budgetUsd),
recorded so resume restores the original invocation's bound (only
the explicit, journaled ResumeOptions.run override changes it,
RV2208, by rewriting this field for the run's remaining life).
Absent when the run started without a ceiling. Stores must
round-trip the field (the conformance kit checks); a store that
drops it degrades a resumed run to uncapped.

***

### configFingerprint?

```ts
optional configFingerprint?: string;
```

Defined in: `packages/core/dist/index.d.ts`

The host-declared config identity (RunOptions.configFingerprint,
RV3210): an opaque pin over what the workflow body closes over,
recorded at genesis and compared on every resume that asserts one.
Absent when the run declared none. A store that drops the field
degrades the check to the UNRECORDED warning, never a false pass
or a false refusal (absence means NOT RECORDED).

***

### execKeyDerivation?

```ts
optional execKeyDerivation?: number;
```

Defined in: `packages/core/dist/index.d.ts`

Which isolated-executor idempotency key derivation this run uses
(RV403), for its WHOLE life: stamped at the fresh start by the
engine (current engines stamp 2, the incarnation-scoped derivation
that binds `genesis` into the key so a `deleteRun`-then-recreate of
the same explicit runId never reuses keys against a long-lived
external dedup store) and carried verbatim by every resume segment.
Absent on runs recorded before the field shipped: those derive the
original genesis-free version 1 keys forever, across resume and
upgrade, so external dedup state accumulated for them stays valid.
A recorded version this engine does not know is a typed resume
refusal when isolated executors are configured (resume with a newer
rulvar), never a silent fallback. Stores must round-trip the field
(the conformance kit checks); a store that drops it degrades a
resumed run's NEW dispatches to version 1 keys, which breaks the
at-least-once fold of a redispatched call for a version 2 run.

***

### genesis?

```ts
optional genesis?: string;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

***

### hashVersionLow?

```ts
optional hashVersionLow?: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### maxInFlightExposureUsd?

```ts
optional maxInFlightExposureUsd?: number;
```

Defined in: `packages/core/dist/index.d.ts`

The opt-in in-flight exposure cap
(RunOptions.maxInFlightExposureUsd), recorded at genesis so resume
restores the original invocation's cap (RV1504): the option used
to be per-invocation and unrecorded, and a resumed segment
silently ran WITHOUT the exposure bound, the seventeenth
comparison benchmark's top FinOps gap. Absent when the run started
without one. Stores must round-trip the field (the conformance kit
checks); a store that drops it degrades a resumed run to uncapped
exposure.

***

### name?

```ts
optional name?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### runId

```ts
runId: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### segments?

```ts
optional segments?: number;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

***

### strictPricing?

```ts
optional strictPricing?: {
  allowUnpriced?: string[];
  maxRatesAgeDays?: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

The opt-in strict pre-egress pricing gate
(RunOptions.strictPricing canonicalized, RV1508), recorded at
genesis so resume restores the posture: a FinOps gate a resumed
segment silently drops is not a gate. Absent when the run started
without it. Stores must round-trip the field (the conformance kit
checks); a store that drops it degrades a resumed run to unpriced
dispatch.

#### allowUnpriced?

```ts
optional allowUnpriced?: string[];
```

#### maxRatesAgeDays?

```ts
optional maxRatesAgeDays?: number;
```

***

### tags?

```ts
optional tags?: string[];
```

Defined in: `packages/core/dist/index.d.ts`

***

### updatedAt

```ts
updatedAt: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### workflowHash?

```ts
optional workflowHash?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### workflowName?

```ts
optional workflowName?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### workflowSourceRef?

```ts
optional workflowSourceRef?: string;
```

Defined in: `packages/core/dist/index.d.ts`
