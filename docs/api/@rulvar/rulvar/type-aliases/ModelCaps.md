[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelCaps

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

### minOutputTokensPerTurn?

```ts
optional minOutputTokensPerTurn?: number;
```

Defined in: `packages/core/dist/index.d.ts`

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
