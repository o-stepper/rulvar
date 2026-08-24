[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sfqRecordArrival

# Function: sfqRecordArrival()

```ts
function sfqRecordArrival(
   state, 
   memberKey, 
   finishTag): FairQueueState;
```

Defined in: `packages/core/dist/index.d.ts`

Records the arrival: the member's finish tag advances.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`FairQueueState`](/api/@rulvar/rulvar/interfaces/FairQueueState.md) |
| `memberKey` | `string` |
| `finishTag` | `number` |

## Returns

[`FairQueueState`](/api/@rulvar/rulvar/interfaces/FairQueueState.md)
