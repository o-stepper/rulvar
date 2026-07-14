[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / decodeCheckpoint

# Function: decodeCheckpoint()

```ts
function decodeCheckpoint(blob): 
  | CheckpointState
  | undefined;
```

Defined in: [packages/core/src/journal/checkpoint.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L106)

Decodes a checkpoint blob. Returns undefined for an empty blob or an
unknown format byte: a resume never trusts a checkpoint it cannot
parse; the dangling dispatch reruns from the top instead (at-least-once
is the documented floor).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | `Uint8Array` |

## Returns

  \| [`CheckpointState`](/api/@rulvar/core/interfaces/CheckpointState.md)
  \| `undefined`
