[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunMeta

# Type Alias: RunMeta

```ts
type RunMeta = {
  budgetUsd?: number;
  hashVersionHigh?: number;
  hashVersionLow?: number;
  name?: string;
  runId: string;
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
