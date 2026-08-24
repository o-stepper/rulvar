[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / windowAdvance

# Function: windowAdvance()

```ts
function windowAdvance(state, nowSlot): SlidingWindowState;
```

Defined in: [packages/core/src/admission/algorithms.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L93)

Rotates the ring so `nowSlot` is the head; expired slots zero out.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`SlidingWindowState`](/api/@rulvar/core/interfaces/SlidingWindowState.md) |
| `nowSlot` | `number` |

## Returns

[`SlidingWindowState`](/api/@rulvar/core/interfaces/SlidingWindowState.md)
