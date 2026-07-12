[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelCaps

# Type Alias: ModelCaps

```ts
type ModelCaps = {
  contextWindow: number;
  maxOutputTokens: number;
  pricing?: Pricing;
  reasoningEfforts: Effort[];
  structuredOutput: "native" | "forced-tool" | "prompt";
  supportsParallelTools: boolean;
  supportsTemperature: boolean;
};
```

Defined in: `packages/core/dist/index.d.ts`

Capability facts the router consumes for tier selection and scrubbing.

## Properties

### contextWindow

```ts
contextWindow: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### maxOutputTokens

```ts
maxOutputTokens: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### pricing?

```ts
optional pricing?: Pricing;
```

Defined in: `packages/core/dist/index.d.ts`

***

### reasoningEfforts

```ts
reasoningEfforts: Effort[];
```

Defined in: `packages/core/dist/index.d.ts`

***

### structuredOutput

```ts
structuredOutput: "native" | "forced-tool" | "prompt";
```

Defined in: `packages/core/dist/index.d.ts`

***

### supportsParallelTools

```ts
supportsParallelTools: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

***

### supportsTemperature

```ts
supportsTemperature: boolean;
```

Defined in: `packages/core/dist/index.d.ts`
