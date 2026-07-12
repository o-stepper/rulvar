[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunMeta

# Type Alias: RunMeta

```ts
type RunMeta = {
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

Defined in: [packages/core/src/l0/spi/store.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L26)

Run-level metadata written by the ENGINE via putMeta as a separate
record, so listRuns never parses payloads. The hashVersion range fields
are advisory only; the journal is authoritative (docs/03, section
"RunMeta").

## Properties

### hashVersionHigh?

```ts
optional hashVersionHigh?: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L33)

***

### hashVersionLow?

```ts
optional hashVersionLow?: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L32)

***

### name?

```ts
optional name?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L29)

***

### runId

```ts
runId: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L27)

***

### status

```ts
status: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L28)

***

### tags?

```ts
optional tags?: string[];
```

Defined in: [packages/core/src/l0/spi/store.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L30)

***

### updatedAt

```ts
updatedAt: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L31)

***

### workflowHash?

```ts
optional workflowHash?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L37)

Content hash of the body or of the compiled source.

***

### workflowName?

```ts
optional workflowName?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L35)

Registered workflow name (in-process Workflow).

***

### workflowSourceRef?

```ts
optional workflowSourceRef?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L39)

TranscriptStore ref of the persisted CompiledWorkflow source.
