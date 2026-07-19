[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunMeta

# Type Alias: RunMeta

```ts
type RunMeta = {
  budgetUsd?: number;
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

Defined in: `packages/core/dist/index.d.ts`

Run-level metadata written by the ENGINE via putMeta as a separate
record, so listRuns never parses payloads. The hashVersion range fields
are advisory only; the journal is authoritative.

## Properties

### budgetUsd?

```ts
optional budgetUsd?: number;
```

Defined in: `packages/core/dist/index.d.ts`

The run's immutable USD ceiling (RunOptions.budgetUsd), recorded so
resume restores the original invocation's bound. Absent when the
run started without a ceiling. Stores must round-trip the field
(the conformance kit checks); a store that drops it degrades a
resumed run to uncapped.

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
