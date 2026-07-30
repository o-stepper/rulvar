[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Usage

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

Defined in: [packages/core/src/l0/messages.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L132)

Usage under the Usage invariant: inputTokens is the FULL prompt size
including cache reads and cache writes. Adapters MUST normalize
provider-reported usage to satisfy this invariant, and the core verifies
it at the adapter boundary.

## Properties

### cacheReadTokens

```ts
cacheReadTokens: number;
```

Defined in: [packages/core/src/l0/messages.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L135)

***

### cacheWrite1hTokens?

```ts
optional cacheWrite1hTokens?: number;
```

Defined in: [packages/core/src/l0/messages.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L149)

***

### cacheWrite5mTokens?

```ts
optional cacheWrite5mTokens?: number;
```

Defined in: [packages/core/src/l0/messages.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L148)

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

Defined in: [packages/core/src/l0/messages.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L136)

***

### inputTokens

```ts
inputTokens: number;
```

Defined in: [packages/core/src/l0/messages.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L133)

***

### outputTokens

```ts
outputTokens: number;
```

Defined in: [packages/core/src/l0/messages.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L134)

***

### reasoningTokens?

```ts
optional reasoningTokens?: number;
```

Defined in: [packages/core/src/l0/messages.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L137)
