[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / parkDispositionOf

# Function: parkDispositionOf()

```ts
function parkDispositionOf(
   isolation, 
   pins, 
   maxPinnedWorktrees?): ParkDisposition;
```

Defined in: [packages/plan/src/park.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L66)

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `isolation` | \| [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) \| `undefined` | `undefined` |
| `pins` | [`PinLedger`](/api/@rulvar/plan/classes/PinLedger.md) | `undefined` |
| `maxPinnedWorktrees` | `number` | `DEFAULT_MAX_PINNED_WORKTREES` |

## Returns

[`ParkDisposition`](/api/@rulvar/plan/interfaces/ParkDisposition.md)
