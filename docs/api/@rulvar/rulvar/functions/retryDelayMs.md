[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / retryDelayMs

# Function: retryDelayMs()

```ts
function retryDelayMs(
   policy, 
   retryIndex, 
   retryAfterMs?, 
   random?): number;
```

Defined in: `packages/core/dist/index.d.ts`

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

| Parameter | Type |
| ------ | ------ |
| `policy` | [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md) |
| `retryIndex` | `number` |
| `retryAfterMs?` | `number` |
| `random?` | () => `number` |

## Returns

`number`
