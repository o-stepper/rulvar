[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / retryDelayMs

# Function: retryDelayMs()

```ts
function retryDelayMs(
   policy, 
   retryIndex, 
   retryAfterMs?, 
   random?): number;
```

Defined in: [packages/core/src/model/retry.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L86)

The delay before retry number `retryIndex` (zero based: the delay
after the first failed attempt has index 0). A VALID provider
supplied retryAfterMs (finite and nonnegative) REPLACES the
computed delay (Appendix A); anything else (NaN, Infinity, a
negative) is ignored as adapter noise and the policy backoff
applies, so this boundary stays defensive against custom adapters
(v1.28.0 review P2). Jitter is equal jitter: half the backoff is
deterministic, half random, so a jittered delay never collapses to
zero. The result is always a finite nonnegative integer clamped to
the Node timer maximum (2147483647 ms).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `policy` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | `undefined` |
| `retryIndex` | `number` | `undefined` |
| `retryAfterMs?` | `number` | `undefined` |
| `random?` | () => `number` | `nativeRandom` |

## Returns

`number`
