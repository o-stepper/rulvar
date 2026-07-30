[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelCaps

# Type Alias: ModelCaps

```ts
type ModelCaps = {
  contextWindow: number;
  maxOutputTokens: number;
  minOutputTokensPerTurn?: number;
  pricing?: Pricing;
  reasoningEfforts: Effort[];
  structuredOutput: "native" | "forced-tool" | "prompt";
  supportsParallelTools: boolean;
  supportsTemperature: boolean;
};
```

Defined in: [packages/core/src/l0/spi/provider.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L73)

Capability facts the router consumes for tier selection and scrubbing.

## Properties

### contextWindow

```ts
contextWindow: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L79)

***

### maxOutputTokens

```ts
maxOutputTokens: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L80)

***

### minOutputTokensPerTurn?

```ts
optional minOutputTokensPerTurn?: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L90)

The smallest request output cap the provider accepts (the v1.74
experiment review, P0.1): OpenAI's Responses API rejects
max_output_tokens below 16, so a dispatch under this floor is a
guaranteed 400. The runtime never sends a request output cap below
it: a budget last gasp dispatches the floor instead of one token,
and a remainder that cannot buy the floor is refused typed before
the wire. Absent means one, the historical floor.

***

### pricing?

```ts
optional pricing?: Pricing;
```

Defined in: [packages/core/src/l0/spi/provider.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L92)

Adapter-reported fallback only; the versioned price table wins.

***

### reasoningEfforts

```ts
reasoningEfforts: Effort[];
```

Defined in: [packages/core/src/l0/spi/provider.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L78)

Canonical efforts this model accepts after mapping.

***

### structuredOutput

```ts
structuredOutput: "native" | "forced-tool" | "prompt";
```

Defined in: [packages/core/src/l0/spi/provider.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L74)

***

### supportsParallelTools

```ts
supportsParallelTools: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L76)

***

### supportsTemperature

```ts
supportsTemperature: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L75)
