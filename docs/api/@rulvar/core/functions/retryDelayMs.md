[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / retryDelayMs

# Function: retryDelayMs()

```ts
function retryDelayMs(
   policy, 
   retryIndex, 
   retryAfterMs?, 
   random?): number;
```

Defined in: [packages/core/src/model/retry.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L60)

The delay before retry number `retryIndex` (0-based: the delay after
the first failed attempt has index 0). A provider-supplied
retryAfterMs REPLACES the computed delay (Appendix A). Jitter is
equal-jitter: half the backoff is deterministic, half random, so a
jittered delay never collapses to zero.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `policy` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | `undefined` |
| `retryIndex` | `number` | `undefined` |
| `retryAfterMs?` | `number` | `undefined` |
| `random?` | () => `number` | `Math.random` |

## Returns

`number`
