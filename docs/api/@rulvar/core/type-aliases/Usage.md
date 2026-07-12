[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Usage

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

Defined in: [packages/core/src/l0/messages.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L139)

Usage under the Usage invariant: inputTokens is the FULL prompt size
including cache reads and cache writes. Adapters MUST normalize
provider-reported usage to satisfy this invariant, and the core verifies
it at the adapter boundary (docs/04, section "Usage invariant").

## Properties

### cacheReadTokens

```ts
cacheReadTokens: number;
```

Defined in: [packages/core/src/l0/messages.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L142)

***

### cacheWriteTokens

```ts
cacheWriteTokens: number;
```

Defined in: [packages/core/src/l0/messages.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L143)

***

### inputTokens

```ts
inputTokens: number;
```

Defined in: [packages/core/src/l0/messages.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L140)

***

### outputTokens

```ts
outputTokens: number;
```

Defined in: [packages/core/src/l0/messages.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L141)

***

### reasoningTokens?

```ts
optional reasoningTokens?: number;
```

Defined in: [packages/core/src/l0/messages.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L144)
