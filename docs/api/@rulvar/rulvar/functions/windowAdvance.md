[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / windowAdvance

# Function: windowAdvance()

```ts
function windowAdvance(state, nowSlot): SlidingWindowState;
```

Defined in: `packages/core/dist/index.d.ts`

Rotates the ring so `nowSlot` is the head; expired slots zero out.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`SlidingWindowState`](/api/@rulvar/rulvar/interfaces/SlidingWindowState.md) |
| `nowSlot` | `number` |

## Returns

[`SlidingWindowState`](/api/@rulvar/rulvar/interfaces/SlidingWindowState.md)
