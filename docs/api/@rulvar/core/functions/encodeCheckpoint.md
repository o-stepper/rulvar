[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / encodeCheckpoint

# Function: encodeCheckpoint()

```ts
function encodeCheckpoint(state): Uint8Array;
```

Defined in: [packages/core/src/journal/checkpoint.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L85)

Serializes a checkpoint to its blob: format byte then UTF-8 JSON.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`CheckpointState`](/api/@rulvar/core/interfaces/CheckpointState.md) |

## Returns

`Uint8Array`
