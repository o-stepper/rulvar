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

Defined in: [packages/core/src/l0/spi/provider.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L60)

Capability facts the router consumes for tier selection and scrubbing.

## Properties

### contextWindow

```ts
contextWindow: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L66)

***

### maxOutputTokens

```ts
maxOutputTokens: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L67)

***

### pricing?

```ts
optional pricing?: Pricing;
```

Defined in: [packages/core/src/l0/spi/provider.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L69)

Adapter-reported fallback only; the versioned price table wins.

***

### reasoningEfforts

```ts
reasoningEfforts: Effort[];
```

Defined in: [packages/core/src/l0/spi/provider.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L65)

Canonical efforts this model accepts after mapping.

***

### structuredOutput

```ts
structuredOutput: "native" | "forced-tool" | "prompt";
```

Defined in: [packages/core/src/l0/spi/provider.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L61)

***

### supportsParallelTools

```ts
supportsParallelTools: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L63)

***

### supportsTemperature

```ts
supportsTemperature: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L62)
