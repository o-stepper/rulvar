[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunMeta

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

Defined in: [packages/core/src/l0/spi/store.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L25)

Run-level metadata written by the ENGINE via putMeta as a separate
record, so listRuns never parses payloads. The hashVersion range fields
are advisory only; the journal is authoritative.

## Properties

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
