[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Usage

# Type Alias: Usage

```ts
type Usage = {
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

Usage under the Usage invariant: inputTokens is the FULL prompt size
including cache reads and cache writes. Adapters MUST normalize
provider-reported usage to satisfy this invariant, and the core verifies
it at the adapter boundary.

## Properties

### cacheReadTokens

```ts
cacheReadTokens: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### cacheWriteTokens

```ts
cacheWriteTokens: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### inputTokens

```ts
inputTokens: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### outputTokens

```ts
outputTokens: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### reasoningTokens?

```ts
optional reasoningTokens?: number;
```

Defined in: `packages/core/dist/index.d.ts`
