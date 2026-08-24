[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / bucketAdvance

# Function: bucketAdvance()

```ts
function bucketAdvance(
   state, 
   nowMs, 
   ratePerSecond, 
   burst): TokenBucketState;
```

Defined in: [packages/core/src/admission/algorithms.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L144)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`TokenBucketState`](/api/@rulvar/core/interfaces/TokenBucketState.md) |
| `nowMs` | `number` |
| `ratePerSecond` | `number` |
| `burst` | `number` |

## Returns

[`TokenBucketState`](/api/@rulvar/core/interfaces/TokenBucketState.md)
