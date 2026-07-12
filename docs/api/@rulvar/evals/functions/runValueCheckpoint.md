[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runValueCheckpoint

# Function: runValueCheckpoint()

```ts
function runValueCheckpoint(checkpointPool, options): Promise<CheckpointReport>;
```

Defined in: [packages/evals/src/checkpoint.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L179)

Runs the checkpoint over the fixed pool. Sequential in declaration
order (deterministic cassette consumption when recorded); every cell
runs baseline then treatment.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `checkpointPool` | [`CheckpointPool`](/api/@rulvar/evals/interfaces/CheckpointPool.md) |
| `options` | [`RunCheckpointOptions`](/api/@rulvar/evals/interfaces/RunCheckpointOptions.md) |

## Returns

`Promise`\&lt;[`CheckpointReport`](/api/@rulvar/evals/interfaces/CheckpointReport.md)\&gt;
