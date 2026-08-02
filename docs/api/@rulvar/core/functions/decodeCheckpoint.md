[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / decodeCheckpoint

# Function: decodeCheckpoint()

```ts
function decodeCheckpoint(blob): 
  | CheckpointState
  | undefined;
```

Defined in: [packages/core/src/journal/checkpoint.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L121)

Decodes a checkpoint blob. Returns undefined for an empty blob, an
unknown format byte, unparseable JSON, a top-level payload that is
not an object (RV1008: `null`, a number, a string, an array), a
parseable payload whose nested message structure is malformed
(RV804), or one whose required counters are not non-negative finite
numbers (RV1409: `turns`, `toolCallsUsed`, `schemaAttempts`, the
usage fields, the compaction points): a resume never trusts a
checkpoint it cannot decode, and it never throws; the dangling
dispatch reruns from the top instead (at-least-once is the
documented floor).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | `Uint8Array` |

## Returns

  \| [`CheckpointState`](/api/@rulvar/core/interfaces/CheckpointState.md)
  \| `undefined`
