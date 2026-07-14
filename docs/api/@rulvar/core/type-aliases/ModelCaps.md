[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelCaps

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

Defined in: [packages/core/src/l0/spi/provider.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L38)

Capability facts the router consumes for tier selection and scrubbing.

## Properties

### contextWindow

```ts
contextWindow: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L44)

***

### maxOutputTokens

```ts
maxOutputTokens: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L45)

***

### pricing?

```ts
optional pricing?: Pricing;
```

Defined in: [packages/core/src/l0/spi/provider.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L47)

Adapter-reported fallback only; the versioned price table wins.

***

### reasoningEfforts

```ts
reasoningEfforts: Effort[];
```

Defined in: [packages/core/src/l0/spi/provider.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L43)

Canonical efforts this model accepts after mapping.

***

### structuredOutput

```ts
structuredOutput: "native" | "forced-tool" | "prompt";
```

Defined in: [packages/core/src/l0/spi/provider.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L39)

***

### supportsParallelTools

```ts
supportsParallelTools: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L41)

***

### supportsTemperature

```ts
supportsTemperature: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L40)
