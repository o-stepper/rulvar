[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / decodeCheckpoint

# Function: decodeCheckpoint()

```ts
function decodeCheckpoint(blob): 
  | CheckpointState
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Decodes a checkpoint blob. Returns undefined for an empty blob, an
unknown format byte, unparseable JSON, a top-level payload that is
not an object (RV1008: `null`, a number, a string, an array), or a
parseable payload whose nested message structure is malformed
(RV804): a resume never trusts a checkpoint it cannot decode, and it
never throws; the dangling dispatch reruns from the top instead
(at-least-once is the documented floor).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | `Uint8Array` |

## Returns

  \| [`CheckpointState`](/api/@rulvar/rulvar/interfaces/CheckpointState.md)
  \| `undefined`
