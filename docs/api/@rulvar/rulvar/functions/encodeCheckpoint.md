[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / encodeCheckpoint

# Function: encodeCheckpoint()

```ts
function encodeCheckpoint(state): Uint8Array;
```

Defined in: `packages/core/dist/index.d.ts`

Serializes a checkpoint to its blob: format byte then UTF-8 JSON.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | [`CheckpointState`](/api/@rulvar/rulvar/interfaces/CheckpointState.md) |

## Returns

`Uint8Array`
