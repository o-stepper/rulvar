[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sfqRecordGrant

# Function: sfqRecordGrant()

```ts
function sfqRecordGrant(state, startTag): FairQueueState;
```

Defined in: `packages/core/dist/index.d.ts`

Records a grant: V advances to the granted start tag, monotonically.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`FairQueueState`](/api/@rulvar/rulvar/interfaces/FairQueueState.md) |
| `startTag` | `number` |

## Returns

[`FairQueueState`](/api/@rulvar/rulvar/interfaces/FairQueueState.md)
