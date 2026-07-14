[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / parkDispositionOf

# Function: parkDispositionOf()

```ts
function parkDispositionOf(
   isolation, 
   pins, 
   maxPinnedWorktrees?): ParkDisposition;
```

Defined in: [packages/plan/src/park.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L64)

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `isolation` | \| [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) \| `undefined` | `undefined` |
| `pins` | [`PinLedger`](/api/@rulvar/plan/classes/PinLedger.md) | `undefined` |
| `maxPinnedWorktrees` | `number` | `DEFAULT_MAX_PINNED_WORKTREES` |

## Returns

[`ParkDisposition`](/api/@rulvar/plan/interfaces/ParkDisposition.md)
