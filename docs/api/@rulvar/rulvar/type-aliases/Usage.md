[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Usage

# Type Alias: Usage

```ts
type Usage = {
  cacheReadTokens: number;
  cacheWrite1hTokens?: number;
  cacheWrite5mTokens?: number;
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

### cacheWrite1hTokens?

```ts
optional cacheWrite1hTokens?: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### cacheWrite5mTokens?

```ts
optional cacheWrite5mTokens?: number;
```

Defined in: `packages/core/dist/index.d.ts`

The cache-write TTL split (RV810), filled by adapters whose
provider distinguishes write TTLs in usage (the Anthropic
cache_creation breakdown). Optional and additive: absent means
undifferentiated writes, priced at the plain write rate exactly as
before. When either field is present the split must SUM to
`cacheWriteTokens` (absent counts zero); `usageViolations` enforces
it and `priceUsdOf` prices each share at its own rate, so a 1h
premium write is no longer billed at the 5m rate.

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
