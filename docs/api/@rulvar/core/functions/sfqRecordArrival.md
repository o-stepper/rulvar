[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sfqRecordArrival

# Function: sfqRecordArrival()

```ts
function sfqRecordArrival(
   state, 
   memberKey, 
   finishTag): FairQueueState;
```

Defined in: [packages/core/src/admission/algorithms.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L49)

Records the arrival: the member's finish tag advances.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`FairQueueState`](/api/@rulvar/core/interfaces/FairQueueState.md) |
| `memberKey` | `string` |
| `finishTag` | `number` |

## Returns

[`FairQueueState`](/api/@rulvar/core/interfaces/FairQueueState.md)
