[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / bucketAdvance

# Function: bucketAdvance()

```ts
function bucketAdvance(
   state, 
   nowMs, 
   ratePerSecond, 
   burst): TokenBucketState;
```

Defined in: `packages/core/dist/index.d.ts`

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`TokenBucketState`](/api/@rulvar/rulvar/interfaces/TokenBucketState.md) |
| `nowMs` | `number` |
| `ratePerSecond` | `number` |
| `burst` | `number` |

## Returns

[`TokenBucketState`](/api/@rulvar/rulvar/interfaces/TokenBucketState.md)
