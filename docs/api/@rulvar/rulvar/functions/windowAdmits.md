[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / windowAdmits

# Function: windowAdmits()

```ts
function windowAdmits(
   state, 
   cap, 
   amount): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Admits when the trailing sum stays under cap. This bounds the fixed
epoch double burst to one sub-window's allowance, a documented burst,
not a silent fix of the pinned RV708 semantics.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`SlidingWindowState`](/api/@rulvar/rulvar/interfaces/SlidingWindowState.md) |
| `cap` | `number` |
| `amount` | `number` |

## Returns

`boolean`
