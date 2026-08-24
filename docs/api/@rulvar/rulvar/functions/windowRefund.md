[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / windowRefund

# Function: windowRefund()

```ts
function windowRefund(state, amount): SlidingWindowState;
```

Defined in: `packages/core/dist/index.d.ts`

Refunds into the head slot; never below zero across the ring.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`SlidingWindowState`](/api/@rulvar/rulvar/interfaces/SlidingWindowState.md) |
| `amount` | `number` |

## Returns

[`SlidingWindowState`](/api/@rulvar/rulvar/interfaces/SlidingWindowState.md)
