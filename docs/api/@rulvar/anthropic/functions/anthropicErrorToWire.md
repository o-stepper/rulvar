[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / anthropicErrorToWire

# Function: anthropicErrorToWire()

```ts
function anthropicErrorToWire(error): WireError;
```

Defined in: [packages/anthropic/src/wire.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L628)

Projects an SDK/API error into the retryable WireError vocabulary:
429 rate limits surface retryAfterMs and the x-ratelimit-* buckets; 529
overloaded and 5xx are retryable transport; everything else is terminal
transport. Adapters never sleep internally.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | `unknown` |

## Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)
