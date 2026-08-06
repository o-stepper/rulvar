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
  promptCaching?: "explicit" | "implicit";
  reasoningEfforts: Effort[];
  structuredOutput: "native" | "forced-tool" | "prompt";
  supportsParallelTools: boolean;
  supportsTemperature: boolean;
};
```

Defined in: [packages/core/src/l0/spi/provider.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L96)

Capability facts the router consumes for tier selection and scrubbing.

## Properties

### contextWindow

```ts
contextWindow: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L102)

***

### maxOutputTokens

```ts
maxOutputTokens: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L103)

***

### minOutputTokensPerTurn?

```ts
optional minOutputTokensPerTurn?: number;
```

Defined in: [packages/core/src/l0/spi/provider.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L113)

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

Defined in: [packages/core/src/l0/spi/provider.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L125)

Adapter-reported fallback only; the versioned price table wins.

***

### promptCaching?

```ts
optional promptCaching?: "explicit" | "implicit";
```

Defined in: [packages/core/src/l0/spi/provider.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L123)

How this model's prompt caching is driven (RV2006). 'explicit'
means the adapter compiles ChatRequest.cacheHint into provider
cache directives (Anthropic cache_control) and the agent loop's
cache policy attaches hints by default; 'implicit' means the
provider caches server-side on its own and hints are neither
needed nor sent (OpenAI). Absent means unknown: the loop attaches
nothing and the wire stays byte identical to pre-RV2006 traffic.

***

### reasoningEfforts

```ts
reasoningEfforts: Effort[];
```

Defined in: [packages/core/src/l0/spi/provider.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L101)

Canonical efforts this model accepts after mapping.

***

### structuredOutput

```ts
structuredOutput: "native" | "forced-tool" | "prompt";
```

Defined in: [packages/core/src/l0/spi/provider.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L97)

***

### supportsParallelTools

```ts
supportsParallelTools: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L99)

***

### supportsTemperature

```ts
supportsTemperature: boolean;
```

Defined in: [packages/core/src/l0/spi/provider.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L98)
