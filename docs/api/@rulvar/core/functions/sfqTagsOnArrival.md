[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sfqTagsOnArrival

# Function: sfqTagsOnArrival()

```ts
function sfqTagsOnArrival(
   state, 
   memberKey, 
   costWires, 
   weight): {
  finishTag: number;
  startTag: number;
};
```

Defined in: [packages/core/src/admission/algorithms.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L37)

The tags a ticket receives at arrival (pure; mutates nothing).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`FairQueueState`](/api/@rulvar/core/interfaces/FairQueueState.md) |
| `memberKey` | `string` |
| `costWires` | `number` |
| `weight` | `number` |

## Returns

```ts
{
  finishTag: number;
  startTag: number;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `finishTag` | `number` | [packages/core/src/admission/algorithms.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L42) |
| `startTag` | `number` | [packages/core/src/admission/algorithms.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L42) |
