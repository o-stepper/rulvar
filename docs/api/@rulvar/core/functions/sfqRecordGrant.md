[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sfqRecordGrant

# Function: sfqRecordGrant()

```ts
function sfqRecordGrant(state, startTag): FairQueueState;
```

Defined in: [packages/core/src/admission/algorithms.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L61)

Records a grant: V advances to the granted start tag, monotonically.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`FairQueueState`](/api/@rulvar/core/interfaces/FairQueueState.md) |
| `startTag` | `number` |

## Returns

[`FairQueueState`](/api/@rulvar/core/interfaces/FairQueueState.md)
