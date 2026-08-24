[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / windowRefund

# Function: windowRefund()

```ts
function windowRefund(state, amount): SlidingWindowState;
```

Defined in: [packages/core/src/admission/algorithms.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L127)

Refunds into the head slot; never below zero across the ring.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`SlidingWindowState`](/api/@rulvar/core/interfaces/SlidingWindowState.md) |
| `amount` | `number` |

## Returns

[`SlidingWindowState`](/api/@rulvar/core/interfaces/SlidingWindowState.md)
