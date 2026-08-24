[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sfqTagsOnArrival

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

Defined in: `packages/core/dist/index.d.ts`

The tags a ticket receives at arrival (pure; mutates nothing).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`FairQueueState`](/api/@rulvar/rulvar/interfaces/FairQueueState.md) |
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
| `finishTag` | `number` | `packages/core/dist/index.d.ts` |
| `startTag` | `number` | `packages/core/dist/index.d.ts` |
