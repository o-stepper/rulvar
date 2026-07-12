[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / retryDelayMs

# Function: retryDelayMs()

```ts
function retryDelayMs(
   policy, 
   retryIndex, 
   retryAfterMs?, 
   random?): number;
```

Defined in: `packages/core/dist/index.d.ts`

The delay before retry number `retryIndex` (0-based: the delay after
the first failed attempt has index 0). A provider-supplied
retryAfterMs REPLACES the computed delay (Appendix A). Jitter is
equal-jitter: half the backoff is deterministic, half random, so a
jittered delay never collapses to zero.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `policy` | [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md) |
| `retryIndex` | `number` |
| `retryAfterMs?` | `number` |
| `random?` | () => `number` |

## Returns

`number`
